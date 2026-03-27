import { Subscription, SubscriptionStatus, Frequency } from '../types';

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbybObf5oRJdSyQ2Ghkre9OM0oTR0kxnrrU1dA2EKuJ4hBzzfc8XM-rlPGflu9nXQ__76Q/exec";

// Internal date normalization - always returns unambiguous ISO string
const normalizeDate = (val: any): string => {
  if (!val) return '';
  
  // If already a Date object
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? '' : val.toISOString();
  }

  const s = val.toString().trim();
  if (!s || s === 'Pending' || s === 'Not yet decided' || s === 'Invalid Date') return '';
  
  // Try standard parsing
  let d = new Date(s);
  
  // If invalid, try DD/MM/YYYY HH:MM:SS parsing (common in India/UK)
  if (isNaN(d.getTime())) {
    const dmyMatch = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
    if (dmyMatch) {
      const day = parseInt(dmyMatch[1]);
      const month = parseInt(dmyMatch[2]) - 1;
      const year = parseInt(dmyMatch[3]);
      
      // Look for time info
      const timeMatch = s.match(/(\d{1,2}):(\d{1,2}):?(\d{1,2})?(\s*[AP]M)?/i);
      let h = 0, m = 0, sec = 0;
      if (timeMatch) {
        h = parseInt(timeMatch[1]);
        m = parseInt(timeMatch[2]);
        sec = timeMatch[3] ? parseInt(timeMatch[3]) : 0;
        if (timeMatch[4] && timeMatch[4].trim().toUpperCase() === 'PM' && h < 12) h += 12;
        if (timeMatch[4] && timeMatch[4].trim().toUpperCase() === 'AM' && h === 12) h = 0;
      }
      d = new Date(year, month, day, h, m, sec);
    }
  }

  return isNaN(d.getTime()) ? '' : d.toISOString();
};

// Formatting for Google Sheets - returns local "M/D/YYYY H:MM:SS"
const formatForSheet = (val: any): string => {
  if (!val) return '';
  const d = new Date(val);
  if (isNaN(d.getTime())) return '';
  
  const M = d.getMonth() + 1;
  const D = d.getDate();
  const Y = d.getFullYear();
  const h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, '0');
  const sec = d.getSeconds().toString().padStart(2, '0');
  return `${M}/${D}/${Y} ${h}:${m}:${sec}`;
};

const GOOGLE_FORM_URL = 'https://script.google.com/macros/s/AKfycbyQ7VU8dVOWw29JUdtN0Wq-MAOqkCDVNQlatRNmZEl7fY1xZxkNKbyqi5ER7Xy2sfOJlA/exec';

// Calculate delay in days between planned and actual dates
const calculateDelayDays = (planned: any, actual: any): string => {
  if (!planned || !actual) return "";
  const p = new Date(planned);
  const a = new Date(actual);
  if (isNaN(p.getTime()) || isNaN(a.getTime())) return "";

  // Normalize to start of day for cleaner day difference
  p.setHours(0, 0, 0, 0);
  a.setHours(0, 0, 0, 0);

  const diffTime = a.getTime() - p.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays.toString();
};

// Returns date in "D-MMM-YYYY" format (e.g. "15-Feb-2026")
const formatSheetDate = (val: any): string => {
  if (!val) return "";
  const d = new Date(val);
  if (isNaN(d.getTime())) return val.toString();

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const day = d.getDate();
  const month = months[d.getMonth()];
  const year = d.getFullYear();

  return `${day}-${month}-${year}`;
};

export const fetchFromSheet = async (mastersData?: { companies: string[], persons: string[], categories: Record<string, string[]> } | null): Promise<Subscription[] | null> => {
  try {
    const response = await fetch(`${SCRIPT_URL}?sheetName=FMS`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      const text = await response.text();
      console.error("Expected JSON but got:", text.substring(0, 100));
      throw new Error("Received non-JSON response from Google Sheets");
    }

    const data = await response.json();

    // Build category map from already-fetched masters (no extra API call)
    const subNameToCategoryMap: Record<string, string> = {};
    if (mastersData && mastersData.categories) {
      Object.entries(mastersData.categories).forEach(([category, subNames]) => {
        subNames.forEach(name => {
          subNameToCategoryMap[name.toLowerCase().trim()] = category;
        });
      });
    }

    let rows: any[] = [];
    let headerRowIndex = -1;
    if (Array.isArray(data)) {
      // Find the header row (the one that contains "Subscription No" or "Timestamp" or "Subscriber")
      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        if (Array.isArray(row) && row.some(cell => {
          const s = cell.toString().toLowerCase();
          return s.includes("subscription no") ||
            s.includes("timestamp") ||
            s.includes("subscriber") ||
            s.includes("sub no") ||
            s.includes("name of the perosn");
        })) {
          headerRowIndex = i;
          break;
        }
      }

      // Find the group header row (look for "Approval For Subscription")
      let groupRowIndex = -1;
      for (let i = 0; i < Math.max(0, headerRowIndex); i++) {
        if (data[i].some(c => c.toString().toLowerCase().includes("approval for subscription"))) {
          groupRowIndex = i;
          break;
        }
      }
      const groupHeaders = groupRowIndex !== -1 ? data[groupRowIndex] : [];

      if (headerRowIndex !== -1 && Array.isArray(data[headerRowIndex])) {
        const rawHeaders = data[headerRowIndex];
        const headers = rawHeaders.map((h: any, i: number) => {
          const cleanH = h.toString().toLowerCase().replace(/[^a-z0-9]/g, '');
          if (!cleanH) return `col${i}`;

          // Find which group this column belongs to
          let group = "";
          for (let j = i; j >= 0; j--) {
            if (groupHeaders[j] && groupHeaders[j].toString().trim() !== "") {
              group = groupHeaders[j].toString().toLowerCase().replace(/[^a-z0-9]/g, '');
              break;
            }
          }

          if (group.includes("approval")) return `approval${cleanH}`;
          if (group.includes("payment")) return `payment${cleanH}`;
          if (group.includes("renewal")) return `renewal${cleanH}`;
          if (group.includes("audit")) return `audit${cleanH}`;
          return cleanH;
        });

        rows = data.slice(headerRowIndex + 1).map((row: any[], rowIndex: number) => {
          const obj: any = {};
          if (Array.isArray(row)) {
            row.forEach((val, i) => {
              const header = headers[i];
              obj[header] = val;
              obj[`raw_col_${i}`] = val; // Backup mapping
            });
            obj.originalRowIndex = rowIndex + (headerRowIndex + 1);
          }
          return obj;
        });
      } else if (data.length > 0 && Array.isArray(data[0])) {
        // Fallback to first row if no header found
        const rawHeaders = data[0];
        const headers = rawHeaders.map((h: any) => h.toString().toLowerCase().replace(/[^a-z0-9]/g, ''));
        rows = data.slice(1).map((row: any[]) => {
          const obj: any = {};
          if (Array.isArray(row)) {
            row.forEach((val, i) => {
              const header = headers[i] || `col${i}`;
              obj[header] = val;
              obj[`raw_col_${i}`] = val;
            });
          }
          return obj;
        });
      }
    }

    if (rows.length > 0) {
      // 1. Deduplicate by Subscription No (Keep only the LATEST row for each sub)
      const uniqueRowsMap = new Map();
      rows.forEach((row: any) => {
        const subNoText = String(row["subscriptionno"] || row["subno"] || row["subscription_no"] || row["raw_col_2"] || row["raw_col_1"] || "").trim().toUpperCase();
        if (subNoText && subNoText.startsWith("SUB-")) {
          // Overwrites older rows with newer ones because we are iterating in order
          uniqueRowsMap.set(subNoText, row);
        } else {
          uniqueRowsMap.set(`extra-${Math.random()}`, row);
        }
      });
      const uniqueRows = Array.from(uniqueRowsMap.values());

      return uniqueRows
        .filter((item: any) => {
          // Must have at least some non-empty values
          const hasData = Object.values(item).some(val => val !== "" && val !== null && val !== undefined);
          if (!hasData) return false;

          // Must have a real subscription number (starts with SUB-) OR
          // at least 3 non-empty meaningful fields (to exclude rows that only have a Status value)
          const vals = Object.entries(item)
            .filter(([k]) => !k.startsWith('raw_col_'))
            .map(([, v]) => v)
            .filter(v => v !== "" && v !== null && v !== undefined);
          const hasSubNo = vals.some(v => v && v.toString().toUpperCase().startsWith('SUB-'));
          const hasMeaningfulData = vals.length >= 3; // at least 3 non-empty columns
          return hasSubNo || hasMeaningfulData;
        })
        .map((item: any, index: number) => {
          const getVal = (keys: string[], colIndex: number, fallback: any = "") => {
            const clean = (s: any) => s ? s.toString().toLowerCase().replace(/[^a-z0-9]/g, '') : '';
            const itemKeys = Object.keys(item);

            // 1. Try by cleaned header names (Most flexible)
            for (const searchKey of keys) {
              const target = clean(searchKey);
              
              const possibleKeys = [
                target,
                `renewal${target}`,
                `approval${target}`,
                `payment${target}`,
                `audit${target}`
              ];

              for (const pKey of possibleKeys) {
                // Find a key that, when cleaned, matches pKey OR target
                const foundKey = itemKeys.find(k => {
                  const ck = clean(k);
                  return ck === pKey || ck === target;
                });

                if (foundKey && item[foundKey] !== "" && item[foundKey] !== null && item[foundKey] !== undefined) {
                  // Special check: avoid picking up IDs when looking for counts and vice versa
                  const val = String(item[foundKey]);
                  const isLookingForId = target.includes('id') || target.includes('renid');
                  const isLookingForCount = target.includes('count') || target.includes('no') || target.includes('renno');
                  
                  // If we found a number but we are looking for an ID (like REN-XXXX), be cautious
                  if (isLookingForId && !isNaN(Number(val)) && val.length < 5) {
                    // This might be a count, keep looking for a string ID
                    continue; 
                  }
                  
                  return item[foundKey];
                }
              }
            }

            // 2. Try by column index backup (Reliable if headers are missing/unclear)
            const backupKey = `raw_col_${colIndex}`;
            if (item[backupKey] !== undefined && item[backupKey] !== "" && item[backupKey] !== null) {
              const val = item[backupKey];
              // Robust check: don't pick up ISO strings for non-date fields
              const isIsoDate = typeof val === 'string' && val.length > 20 && val.includes('T') && val.includes('Z');
              const isDateSearching = keys.some(k => k.includes('date') || k.includes('planned') || k.includes('actual') || k.includes('timestamp') || k.includes('time'));
              if (isIsoDate && !isDateSearching) {
                // Skip fallback index if it contains an ISO date but we are looking for a name/text field
              } else {
                return val;
              }
            }

            return fallback;
          };

          // Mapping based on current sheet layout (A:0 based):
          // A(0):Timestamp, B(1):SubNo, C(2):Name of Person, D(3):Company, E(4):SubCategory, F(5):SubName, G(6):Freq, H(7):Price, I(8):Planned1, J(9):Actual1, K(10):Status, L(11):Photo
          // Wait! Screenshot shows: K:Planned1, L:Actual1, M:Status, N:Planned2, O:Actual2
          // Based on screenshot mapping (2026 Layout):
          // K(10):Planned 1, L(11):Actual 1, M(12):Status, N(13):Planned 2, O(14):Actual 2

          const rawStatusText = getVal(["status", "approvalstatus", "approval", "approvalforsubscriptionstatus", "currentstatus"], 14, "").toString();
          const cleanStatus = rawStatusText.toUpperCase().replace(/[^A-Z]/g, '');
          
          let status = SubscriptionStatus.PENDING_APPROVAL;
          
          if (cleanStatus.includes('REJECTED')) {
            status = SubscriptionStatus.REJECTED;
          } else if (cleanStatus.includes('EXPIRED')) {
            status = SubscriptionStatus.EXPIRED;
          } else if (cleanStatus.includes('CANCELLED') || cleanStatus.includes('CANCELED')) {
            status = SubscriptionStatus.CANCELLED;
          } else {
            // Process-driven status (Fallback if status text is generic like "Active" or "Approved")
            const actual1Val = getVal(["actual1", "approvedon", "approval_actual1"], -1, ""); 
            const actual2Val = getVal(["actual2", "paidon", "payment_actual2"], -1, "");
            const photoVal = getVal(["photourl", "photo", "billimage", "bill_image"], -1, "");
            const stageVal = String(getVal(["stage", "step", "auditstage", "current_stage", "audit_step"], 0, "")).toUpperCase();

            // 1. Audit / Active Detection (Final Stages)
            if (cleanStatus.includes('ACTIVE') || cleanStatus.includes('DONE') || (stageVal && stageVal !== "" && stageVal !== "-")) {
              status = SubscriptionStatus.ACTIVE;
            } 
            // 2. Billing / Paid Detection
            else if (cleanStatus.includes('PAID') || cleanStatus.includes('BILLING') || photoVal || actual2Val) {
              status = SubscriptionStatus.PAID;
            } 
            // 3. Approved / Payment Detection
            else if (cleanStatus.includes('APPROVED') || cleanStatus.includes('PENDINGPAYMENT') || actual1Val) {
              status = SubscriptionStatus.PENDING_PAYMENT;
            }
            // 4. Default: Pending Approval
            else {
              status = SubscriptionStatus.PENDING_APPROVAL;
            }
          }

          const getValWithStatus = (keys: string[], colIndex: number, fallback: any = "") => {
            const clean = (s: any) => s ? s.toString().toLowerCase().replace(/[^a-z0-9]/g, '') : '';
            const itemKeys = Object.keys(item);

            let prefix = "approval";
            if (status === SubscriptionStatus.PENDING_PAYMENT) prefix = "payment";
            if (status === SubscriptionStatus.ACTIVE || status === SubscriptionStatus.PAID || status === SubscriptionStatus.EXPIRED) prefix = "renewal";

            for (const searchKey of keys) {
              const target = clean(searchKey);
              
              // 1. Try with prefix (approvalplanned, etc.)
              const prefKey = `${prefix}${target}`;
              if (item[prefKey] !== undefined && item[prefKey] !== "" && item[prefKey] !== null) return item[prefKey];

              // 2. Try clean match (planneddate)
              const foundKey = itemKeys.find(k => clean(k) === target);
              if (foundKey && item[foundKey] !== "" && item[foundKey] !== null) return item[foundKey];
            }
            
            // 3. Last Fallback: Column Index
            const backupKey = `raw_col_${colIndex}`;
            if (colIndex !== -1 && item[backupKey] !== undefined && item[backupKey] !== "" && item[backupKey] !== null) {
              return item[backupKey];
            }
            return fallback;
          };

          const rawSubName = String(getVal(["nameofsubscription", "subscriptionname", "subname"], 8, "Unknown"));
          
          // Category logic: lookup from masters or fallback to purpose
          let rawCategory = subNameToCategoryMap[rawSubName.toLowerCase().trim()];
          if (!rawCategory) {
            rawCategory = String(getVal(["categoryofsubscription", "categoryofsubscriptions", "purpose", "details"], 7, "Other"));
          }

          const rawSubNo = getVal(["subscriptionno", "subno", "no"], 2, "");
          const rawCreatedAt = getVal(["timestamp", "createdat", "createdon", "date"], 1, "");

          return {
            id: item.id || `sheet-${index}`,
            rowIndex: item.originalRowIndex ?? index,
            subscriptionNo: String(rawSubNo),
            companyName: String(getVal(["companyname", "company"], 6, "Unknown")),
            subscriberName: String(getVal(["subscribername", "person", "nameoftheperson", "nameoftheperson1"], 5, "Unknown")),
            category: rawCategory,
            subscriptionType: String(getVal(["vendorname", "vendor", "nameofthesubscriptionvendor", "typesofsubscriptions", "subscriptiontype"], 9, "")),
            subscriptionName: rawSubName,
            details: String(getVal(["details", "purpose", "purposeofsubscription", "remarkofpurpose"], 31, "")),
            price: parseFloat(getVal(["price", "cost", "amount"], 10, "0").toString().replace(/[^0-9.]/g, '')) || 0,
            frequency: getVal(["frequency", "freq"], 11, Frequency.MONTHLY) as Frequency,
            status,
            startDate: normalizeDate(getValWithStatus(["planned1", "planned", "planneddate", "startdate"], 12, "")),
            endDate: normalizeDate(getValWithStatus(["enddate", "expirydate", "actual"], 13, "")),
            photoUrl: String(getVal(["photourl", "photo"], 100, "")),
            createdAt: normalizeDate(rawCreatedAt),
            billingMonth: String(getVal(["billingmonth"], 20, "")),
            billingYear: parseInt(getVal(["billingyear"], 21, "0")) || undefined,
            nextRenewalDate: normalizeDate(getVal(["nextrenewaldate"], 22, "")),
            autoRenewal: getVal(["autorenewal"], 23, "").toString().toLowerCase() === 'yes',
            approvalNo: String(getVal(["approvalno", "appno", "approval_no", "app_no"], 34, "")),
            paymentMode: String(getVal(["paymentmode"], 25, "")),
            transactionId: String(getVal(["transactionid"], 26, "")),
            insuranceDoc: String(getVal(["insurancedocument", "insurancedoc"], 27, "")),
            renewalNo: String(getVal(["renewalid", "renewal_id", "ren_id", "renid", "currentrenewal"], -1, "")),
            renewalCount: parseInt(getVal(["renewalno", "renewal_no", "ren_no", "renewalcount", "renewal_count", "renno", "count"], -1, "0")) || 0,
            planned1: normalizeDate(getVal(["approval_planned1", "planned1", "plannedone", "planned"], 12, "")),
            planned2: normalizeDate(getVal(["payment_planned2", "planned2", "plannedtwo"], 12, "")),
            planned3: normalizeDate(getVal(["renewal_planned3", "planned3", "plannedthree"], 12, "")),
            actual1: normalizeDate(getVal(["actual1", "approvedon"], 11, "")),
            actual2: normalizeDate(getVal(["payment_actual2", "actual2", "actualtwo"], 14, "")),
            step: String(getVal(["stage", "step", "auditstage", "audit_stage", "audit_step"], 0, ""))
          };
        });
    }
    return [];
  } catch (error: any) {
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      console.error("Error fetching: Network error or CORS issue.");
    } else {
      console.error("Error fetching from sheet:", error);
    }
    return null;
  }
};

export const addSubscriptionToSheet = async (sub: Subscription) => {
  try {
    const ts = formatForSheet(new Date());
    const payload: any = {
      sheetName: "FMS",
      action: "ADD",
      "STAGE": sub.step || "Audit",
      "Timestamp": ts,
      "Subscription No": sub.subscriptionNo,
      "Renewal ID": sub.renewalNo || "-",
      "Renewal No": sub.renewalCount || 0,
      "Name Of The Person": sub.subscriberName,
      "Company name": sub.companyName,
      "Category of Subscriptions": sub.category,
      "Subscription Name": sub.subscriptionName,
      "Vendor Name": sub.subscriptionType || "",
      "Price ": sub.price,
      "Price": sub.price,
      "Freq": sub.frequency,
      "End Date": formatForSheet(sub.endDate) || "",
      "Status": "Pending",

      // Also keeping camelCase versions for script compatibility if needed
      timestamp: ts,
      subscriptionNo: sub.subscriptionNo,
      subscriberName: sub.subscriberName,
      subscriptionName: sub.subscriptionName,
      subscriptionType: sub.subscriptionType || "",
      vendorName: sub.subscriptionType || "",
      category: sub.category || "",
      details: sub.details,
      price: sub.price,
      frequency: sub.frequency,
      companyName: sub.companyName,
      renewalId: sub.renewalNo || "",
      renewalNo: sub.renewalNo || "", // Legacy support
      renewalCount: sub.renewalCount || 0,
      parentSubscriptionNo: sub.parentSubscriptionNo || "",
    };

    // CRITICAL: Ensure we NEVER touch columns K(Planned 1), N(Planned 2), Q(Planned 3)
    // ANY key containing "Planned" will be stripped to protect ARRAYFORMULAs.
    Object.keys(payload).forEach(key => {
      if (key.toLowerCase().includes("planned")) {
        delete payload[key];
      }
    });

    await fetch(SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify(payload),
      mode: "no-cors",
    });

    // Also write to Subscription's sheet
    await addToSubscriptionLogSheet(sub);

    return true;
  } catch (error) {
    console.error("Error posting to web app:", error);
    return false;
  }
};

export const updateSubscriptionInSheet = async (sub: Subscription) => {
  try {
    // Map status to a human-readable value the sheet can store and re-read correctly
    const statusMap: Record<string, string> = {
      'PENDING_APPROVAL': 'Pending',
      'APPROVED': 'Approved',
      'PENDING_PAYMENT': 'Approved',   // sheet reads "APPROVED" → PENDING_PAYMENT
      'PAID': 'Paid',
      'ACTIVE': 'Active',
      'REJECTED': 'Rejected',
      'EXPIRED': 'Expired',
      'CANCELLED': 'Cancelled',
    };
    const sheetStatus = statusMap[sub.status] ?? sub.status;

    const payload: any = {
      sheetName: "FMS",
      action: "UPDATE",
      rowIndex: sub.rowIndex ?? -1,
      rowNumber: sub.rowIndex !== undefined ? sub.rowIndex + 1 : -1,
      "Subscription No": sub.subscriptionNo,
      "Status": sheetStatus,
      "Status ": sheetStatus,
      "STAGE": sub.step || "Audit",
      "Stage": sub.step || "Audit",
      "Renewal ID": sub.renewalNo || "",
      "Renewal No": sub.renewalCount || 0,
    };

    // CRITICAL: Ensure we NEVER touch columns K(Planned 1), N(Planned 2), Q(Planned 3)
    // in the UPDATE payload as they contain formulas. ANY key containing "Planned" will be stripped.
    Object.keys(payload).forEach(key => {
      if (key.toLowerCase().includes("planned")) {
        delete payload[key];
      }
    });

    // Logic for Approval Section (Phase 1: Approval For Subscription)
    if (sub.status === SubscriptionStatus.PENDING_APPROVAL || 
        sub.status === SubscriptionStatus.PENDING_PAYMENT || 
        sub.status === SubscriptionStatus.REJECTED) {
      
      // Actual 1 = approval timestamp (only when approved; empty if pending/rejected)
      if (sub.status === SubscriptionStatus.PENDING_PAYMENT) {
        const approvalTs = formatForSheet(new Date());
        payload["Actual 1"] = approvalTs;
        payload["Actual"] = approvalTs;
        payload["Approved On"] = approvalTs;
      } else {
        // Pending or Rejected → Actual 1 stays empty
        payload["Actual 1"] = "";
        payload["Actual"] = "";
        payload["Approved On"] = "";
      }
    } 
    // Logic for Payment Section (Phase 2: Payment For Subscription)
    else if (sub.status === SubscriptionStatus.PAID) {
      payload["Payment Mode"] = sub.paymentMode || "";
      payload["Transaction ID"] = sub.transactionId || "";
      // Only Actual 2 gets the payment timestamp
      const paymentTs = formatForSheet(new Date());
      payload["Actual 2"] = paymentTs;
      payload["Time Delay 1"] = sub.timeDelay || ""; // Explicitly allow writing to Time Delay 1
    }
    // Logic for Billing/Active Section (Phase 3: Bill Upload)
    else if (sub.status === SubscriptionStatus.ACTIVE) {
      payload["Photo URL"] = sub.photoUrl || "";
      payload["Photo"] = sub.photoUrl || "";
      if (sub.photoUrl?.startsWith('data:')) {
          payload["file_name"] = `Bill_${sub.subscriptionNo}_${Date.now()}`;
          payload["file_mime"] = sub.photoUrl.split(';')[0].split(':')[1];
      }
      // Do NOT update Planned 1, Planned 2, Planned 3 or Start Date here anymore 
      // as they contain formulas which must not be overwritten.
      payload["End Date"] = formatForSheet(sub.endDate) || "";
      payload["Expiry Date"] = formatForSheet(sub.endDate) || "";
      payload["Next Renewal Date"] = formatForSheet(sub.nextRenewalDate) || "";
    }
    // Logic for Renewal Restart Section (Phase 4: Renewal)
    // When renewal is submitted, the original subscription becomes EXPIRED
    // → write the renewal submission timestamp to "Actual 3"
    else if (sub.status === SubscriptionStatus.EXPIRED) {
      const renewalTs = formatForSheet(new Date());
      payload["Actual 3"] = renewalTs;          // Renewal Restart → Actual 3
      payload["Time Delay 2"] = "";             // Placeholder for Time Delay 2
    }


    await fetch(SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify(payload),
      mode: "no-cors",
    });
    return true;
  } catch (error) {
    console.error("Error updating sheet:", error);
    return false;
  }
};

/**
 * Fetches all records from the "Account Audit" sheet
 */
export const fetchAccountAuditFromSheet = async (): Promise<any[] | null> => {
  try {
    const response = await fetch(`${SCRIPT_URL}?sheetName=Account+Audit`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) return [];

    // Find the header row (searching for "timestamp" or "nameofsubscription")
    let headerRowIndex = 0;
    for (let i = 0; i < Math.min(data.length, 15); i++) {
      if (data[i] && Array.isArray(data[i])) {
        const rowStr = data[i].join('').toLowerCase();
        if (rowStr.includes('timestamp') || rowStr.includes('nameofsubscription')) {
          headerRowIndex = i;
          break;
        }
      }
    }

    const rawHeaders = data[headerRowIndex];
    if (!rawHeaders) return [];
    const headers = rawHeaders.map((h: any) => h ? h.toString().toLowerCase().trim().replace(/[^a-z0-9]/g, '') : '');
    const subNoIdx = headers.findIndex(h => h === 'subscriptionno' || h === 'subno');
    
    // Calculate original row indices BEFORE filtering
    const allRecords = data.slice(headerRowIndex + 1).map((row, relativeIndex) => {
        const obj: any = {};
        if (!row || !Array.isArray(row)) return null;
        
        row.forEach((val, i) => {
          const header = headers[i] || `col${i}`;
          obj[header] = val;
        });
        
        // Key stage tracking: map 'stage' if it's stored in 'ds'
        obj.stage = obj.stage || obj.step || obj.auditstage || obj.auditstep || obj.ds || (obj.col32) || "Audit";
        obj.originalRowIndex = relativeIndex + (headerRowIndex + 2); // Correct 1-indexed row number for Google Sheet
        return obj;
    });

    return allRecords.filter((obj: any) => {
        if (!obj) return false;
        const rowValuesString = Object.values(obj).join(' ').toUpperCase();
        const subNoText = (obj.subscriptionno || obj.subscriptionNo || '').toString().trim().toUpperCase();
        
        // Keep if it has a valid-looking SUB number OR at least a Name
        return subNoText.startsWith("SUB-") || 
               (obj.nameofsubscription && obj.nameofsubscription.toString().trim() !== "");
    });
  } catch (error) {
    console.error("Error fetching from Account Audit sheet:", error);
    return null;
  }
};


/**
 * Updates an existing entry in the "Account Audit" sheet with audit progress
 */
export const updateAuditLogSheetEntry = async (rowNumber: number, stage: string, status: string, remarks: string, nextStep: string, plannedDate?: string) => {
  try {
    if (!rowNumber || rowNumber < 1) return false;

    const ts = formatForSheet(new Date());
    const payload: any = {
      sheetName: "Account Audit",
      action: "UPDATE",
      rowNumber: rowNumber, // rowNumber is now calculated relative to the full sheet
      "STAGE": nextStep,
      "ds": nextStep, // Backup stage column
    };

    const delay = plannedDate ? calculateDelayDays(plannedDate, ts) : "";

    const st = stage.toLowerCase();
    if (st === 'audit') {
      payload["Actual1"] = ts;
      payload["Status1"] = status;
      payload["Remarks1"] = remarks;
      if (delay) payload["Delay1"] = delay;
    } else if (st === 'rectify') {
      payload["Actual2"] = ts;
      payload["Status2"] = status;
      payload["Remarks2"] = remarks;
      if (delay) payload["Delay2"] = delay;
    } else if (st === 're-audit') {
      payload["Actual3"] = ts;
      payload["Status3"] = status;
      payload["Remarks3"] = remarks;
      if (delay) payload["Delay3"] = delay;
    } else if (st === 'tally entry') {
      payload["Actual4"] = ts;
      payload["Status4"] = status;
      payload["Remarks4"] = remarks;
      if (delay) payload["Delay4"] = delay;
    } else if (st === 'bill received') {
      payload["Actual5"] = ts;
      payload["Status5"] = status;
      payload["Remarks5"] = remarks;
      if (delay) payload["Delay5"] = delay;
    }

    await fetch(SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify(payload),
      mode: "no-cors",
    });
    return true;
  } catch (error) {
    console.warn("Failed to update Account Audit sheet entry:", error);
    return false;
  }
};

/**
 * Specifically logs an audit entry to the "Account Audit" sheet
 */
export const addToAuditLogSheet = async (sub: Subscription) => {
  try {
    const payload = {
      sheetName: "Account Audit",
      action: "ADD",
      "Bill Status": "Pending",
      "STAGE": sub.step || "Audit",
      "Timestamp": formatForSheet(new Date()),
      "Subscription No": sub.subscriptionNo,
      "Name of Subscription": sub.subscriptionName,
      "Frequency": sub.frequency,
      "Price": sub.price,
      "Start Date": formatForSheet(sub.startDate) || "-",
      "End Date": formatForSheet(sub.endDate) || "-",
      "Bill Image": sub.photoUrl || "-",
      
      // Initial empty audit fields
      "Actual1": "", "Delay1": "", "Status1": "", "Remarks1": sub.auditRemarks || "",
      "Actual2": "", "Delay2": "", "Status2": "", "Remarks2": "",
      "Actual3": "", "Delay3": "", "Status3": "", "Remarks3": "",
      "Actual4": "", "Delay4": "", "Status4": "", "Remarks4": "",
      "Actual5": "", "Delay5": "", "Status5": "", "Remarks5": "",
      "ds": ""
      // Planned1-5 are NOT included here to prevent overwriting formulas/fixed data in the sheet
    };

    await fetch(SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify(payload),
      mode: "no-cors",
    });
    return true;
  } catch (error) {
    console.warn("Failed to log to Account Audit sheet:", error);
    return false;
  }
};

export const deleteSubscriptionFromSheet = async (subscriptionNo: string) => {
  try {
    await fetch(SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({
        action: "DELETE",
        sheetName: "FMS",
        subscriptionNo: subscriptionNo
      }),
      mode: "no-cors",
    });
    return true;
  } catch (error) {
    console.error("Error deleting from sheet:", error);
    return false;
  }
};

// Write a renewal entry to the "Renewal DB" sheet
// Headers: Subscription No. | Name Of The Perosn | Subscription Name | Purpose Of Subscription | Price | Freq | Planned | Step | Gmail ID | How | Renwal Form | Query | Step
export const addToRenewalDB = async (sub: Subscription) => {
  const plannedDate = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  const payload: Record<string, any> = {
    sheetName: "Renewal DB",
    action: "ADD",
    subscriptionNo: sub.subscriptionNo,
    "Subscription No.": sub.subscriptionNo,
    "Name Of The Person": sub.subscriberName,
    "Category of Subscriptions": sub.category || "",
    "Subscription Name": sub.subscriptionName,
    "Vendor Name": sub.subscriptionType || "",
    "Purpose Of Subscription": sub.details,
    "Price ": sub.price,
    "Freq": sub.frequency,
    "Planned": formatForSheet(sub.startDate) || "",
    "Step": "",
    "Gmail ID": "",
    "How": GOOGLE_FORM_URL,
    "Query": "",
    "Renewal ID": sub.renewalNo || "",
    "Renewal No": sub.renewalCount || 0,
  };

  try {
    await fetch(SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify(payload),
      mode: "no-cors",
    });
    return true;
  } catch (err) {
    console.error("❌ Renewal DB write failed:", err);
    return false;
  }
};

export const fetchFromRenewalDB = async (): Promise<any[] | null> => {
  try {
    const response = await fetch(`${SCRIPT_URL}?sheetName=Renewal+DB`);
    if (!response.ok) return null;
    const data = await response.json();

    if (Array.isArray(data) && data.length > 0) {
      const rawHeaders = data[0];
      const headers = rawHeaders.map((h: any) => h.toString().toLowerCase().trim().replace(/[^a-z0-9]/g, ''));

      return data.slice(1).map((row: any[]) => {
        const obj: any = {};
        row.forEach((val, i) => {
          const key = headers[i] || `col${i}`;
          obj[key] = val;
        });
        return obj;
      });
    }
    return [];
  } catch (error) {
    console.error("Error fetching from Renewal DB:", error);
    return null;
  }
};

// Write a log entry to the "Subscription's" sheet
export const addToSubscriptionLogSheet = async (sub: Subscription) => {
  const ts = formatForSheet(new Date());

  const payload: Record<string, any> = {
    sheetName: "Subscription's",
    action: "ADD",
    "Timestamp": ts,
    "Subscription No.": sub.subscriptionNo,
    "Subscription No": sub.subscriptionNo,
    "Category of Subscriptions": sub.category || "",
    "Subscription Name": sub.subscriptionName,
    "Price": sub.price,
    "Frequency": sub.frequency,
    "Start Date": formatForSheet(sub.startDate) || "",
    "End Date": formatForSheet(sub.endDate) || ""
  };

  try {
    await fetch(SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify(payload),
      mode: "no-cors",
    });
    return true;
  } catch (err) {
    console.error("❌ Subscription's sheet write failed:", err);
    return false;
  }
};


export const fetchUsersFromSheet = async (): Promise<any[] | null> => {
  try {
    const response = await fetch(`${SCRIPT_URL}?sheetName=Login`);
    if (!response.ok) return null;
    const data = await response.json();

    if (Array.isArray(data) && data.length > 0) {
      const rawHeaders = data[0];
      const headers = rawHeaders.map((h: any) => h.toString().toLowerCase().trim().replace(/[^a-z0-9]/g, ''));

      return data.slice(1).map((row: any[]) => {
        const obj: any = {};
        row.forEach((val, i) => {
          const key = headers[i] || `col${i}`;
          obj[key] = val !== null && val !== undefined ? val.toString().trim() : '';
        });
        return obj;
      });
    }
    return [];
  } catch (error) {
    console.error("Error fetching users:", error);
    return null;
  }
};

export const addUserToSheet = async (user: any) => {
  try {
    await fetch(SCRIPT_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({
        action: "ADD",
        sheetName: "Login",
        username: user.username,
        name: user.name,
        email: user.email,
        password: user.password,
        role: user.role,
        "Username": user.username,
        "Name": user.name,
        "Email": user.email,
        "Password": user.password,
        "Role": user.role
      })
    });
    return true;
  } catch (error) {
    console.error("Error adding user to sheet:", error);
    return false;
  }
};

export const fetchMastersFromSheet = async (): Promise<{ companies: string[], persons: string[], categories: Record<string, string[]> } | null> => {
  try {
    const response = await fetch(`${SCRIPT_URL}?sheetName=Masters`);
    if (!response.ok) return null;
    const data = await response.json();

    if (Array.isArray(data) && data.length > 0) {
      const headers = data[0].map((h: any) => h ? h.toString().trim() : '');
      const result: { companies: string[], persons: string[], categories: Record<string, string[]> } = {
        companies: [],
        persons: [],
        categories: {}
      };

      headers.forEach((header: string, index: number) => {
        const columnData = data.slice(1)
          .map(row => row[index])
          .filter(val => val !== null && val !== undefined && val.toString().trim() !== "");

        const lowerHeader = header.toLowerCase();
        if (lowerHeader.includes("company")) {
          result.companies = columnData;
        } else if (lowerHeader.includes("person") || lowerHeader.includes("subscriber")) {
          result.persons = columnData;
        } else if (index >= 2 && header && !lowerHeader.includes("category of subscription")) {
          result.categories[header] = columnData;
        } else if (index === 0 && columnData.length > 0 && result.persons.length === 0) {
          // Fallback for column A if no explicit person column found elsewhere
          result.persons = columnData;
        }
      });

      return result;
    }
    return null;
  } catch (error) {
    console.error("Error fetching masters:", error);
    return null;
  }
};

export const deleteUserFromSheet = async (username: string) => {
  try {
    await fetch(SCRIPT_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({
        action: "DELETE",
        sheetName: "Login",
        username: username
      })
    });
    return true;
  } catch (error) {
    console.error("Error deleting user from sheet:", error);
    return false;
  }
};

/**
 * Specifically logs an entry to the "Billing Details" sheet
 */
export const addToBillingSheet = async (sub: Subscription) => {
  try {
    const ts = formatForSheet(new Date());
    const payload = {
      sheetName: "Billing Details",
      action: "ADD",
      "Timestamp": ts,
      "Subscription No": sub.subscriptionNo,
      "Renewal ID": sub.renewalNo || "-",
      "Renewal No": sub.renewalCount || 0,
      "Name Of The Person": sub.subscriberName,
      "Company name": sub.companyName,
      "Category of Subscriptions": sub.category,
      "Subscription Name": sub.subscriptionName,
      "Vendor Name": sub.subscriptionType || "",
      "Price ": sub.price,
      "Price": sub.price,
      "Freq": sub.frequency,
      "Start date": formatForSheet(sub.startDate) || "",
      "End Date": formatForSheet(sub.endDate) || "",
      "Bill Image": sub.photoUrl || ""
    };

    await fetch(SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify(payload),
      mode: "no-cors",
    });
    return true;
  } catch (error) {
    console.error("Error logging to Billing Details sheet:", error);
    return false;
  }
};
