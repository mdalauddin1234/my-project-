import { Subscription, SubscriptionStatus, Frequency } from '../types';

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwd7gEcAih5XsFBHmd55rBg0ZHvSUfrwOzESLBkVAk8VcBtsxmFMwMfBWgvlrc6xhdd9A/exec";

// Normalize any date string into consistent "M/D/YYYY H:MM:SS" format matching the Google Sheet
// e.g. "3/6/2026 16:27:37"
const normalizeDate = (val: any): string => {
  if (!val) return '';
  const s = val.toString().trim();
  if (!s || s === 'Pending' || s === 'Not yet decided' || s === 'Invalid Date') return '';
  const d = new Date(s);
  if (isNaN(d.getTime())) return ''; // Return empty string for invalid dates
  const M = d.getMonth() + 1;
  const D = d.getDate();
  const Y = d.getFullYear();
  const h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, '0');
  const sec = d.getSeconds().toString().padStart(2, '0');
  return `${M}/${D}/${Y} ${h}:${m}:${sec}`;
};

const GOOGLE_FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSeEVCLUwAoMXXSmC0rWUDnKSZuQs3LmF-Ki_6fgOZ2wFifYcg/viewform?usp=sf_link';

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
    if (Array.isArray(data)) {
      // Find the header row (the one that contains "Subscription No" or "Timestamp" or "Subscriber")
      let headerRowIndex = -1;
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

          if (group.includes("approval")) return `approval_${cleanH}`;
          if (group.includes("payment")) return `payment_${cleanH}`;
          if (group.includes("renewal")) return `renewal_${cleanH}`;
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
      return rows
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
              // Exact match first
              let foundKey = itemKeys.find(k => clean(k) === target);

              // If not found, try a very cautious inclusion (only for longer keys)
              if (!foundKey && target.length > 8) {
                foundKey = itemKeys.find(k => clean(k).includes(target));
              }

              if (foundKey && item[foundKey] !== "" && item[foundKey] !== null && item[foundKey] !== undefined) {
                // Special check: if we are looking for Category, but found a header containing 'type', skip it
                if (target.includes('category') && clean(foundKey).includes('type')) continue;
                return item[foundKey];
              }
            }

            // 2. Try by column index backup (Reliable if headers are missing/unclear)
            const backupKey = `raw_col_${colIndex}`;
            if (item[backupKey] !== undefined && item[backupKey] !== "" && item[backupKey] !== null) {
              return item[backupKey];
            }

            return fallback;
          };

          // Mapping based on current sheet layout (A:0 based):
          // A(0):Timestamp, B(1):SubNo, C(2):Name of Person, D(3):Company, E(4):Purpose, F(5):SubName, G(6):Freq, H(7):Price, I(8):Planned, J(9):Actual, K(10):Status, L(11):Photo

          let rawCreatedAt = getVal(["timestamp", "time"], 0, new Date().toISOString());
          let rawSubNo = getVal(["subscriptionno", "subno", "no"], 1, `SUB-${(index + 1).toString().padStart(4, '0')}`);

          if (rawCreatedAt && rawCreatedAt.toString().startsWith("SUB-")) {
            const temp = rawCreatedAt;
            rawCreatedAt = rawSubNo;
            rawSubNo = temp;
          }

          const rawStatus = getVal(["status", "approval", "approvalforsubscriptionstatus"], 10, SubscriptionStatus.PENDING_APPROVAL);
          let status = SubscriptionStatus.PENDING_APPROVAL;
          const cleanStatus = rawStatus.toString().toUpperCase().replace(/[^A-Z]/g, '');

          if (cleanStatus.includes('ACTIVE')) status = SubscriptionStatus.ACTIVE;
          else if (cleanStatus.includes('PAYMENT') || cleanStatus.includes('APPROVED')) status = SubscriptionStatus.PENDING_PAYMENT;
          else if (cleanStatus.includes('PAID')) status = SubscriptionStatus.PAID;
          else if (cleanStatus.includes('REJECTED')) status = SubscriptionStatus.REJECTED;
          else if (cleanStatus.includes('EXPIRED')) status = SubscriptionStatus.EXPIRED;
          else if (cleanStatus.includes('CANCELLED') || cleanStatus.includes('CANCELED')) status = SubscriptionStatus.CANCELLED;
          else if (cleanStatus === 'PENDING') status = SubscriptionStatus.PENDING_APPROVAL;

          const getValWithStatus = (keys: string[], colIndex: number, fallback: any = "") => {
            const clean = (s: any) => s ? s.toString().toLowerCase().replace(/[^a-z0-9]/g, '') : '';
            const itemKeys = Object.keys(item);

            let prefix = "approval_";
            if (status === SubscriptionStatus.PENDING_PAYMENT) prefix = "payment_";
            if (status === SubscriptionStatus.ACTIVE || status === SubscriptionStatus.PAID) prefix = "renewal_";

            for (const searchKey of keys) {
              const target = clean(searchKey);
              const prefKey = `${prefix}${target}`;
              if (item[prefKey] !== undefined && item[prefKey] !== "" && item[prefKey] !== null) {
                return item[prefKey];
              }
              const foundKey = itemKeys.find(k => clean(k) === target);
              if (foundKey && item[foundKey] !== "" && item[foundKey] !== null) {
                return item[foundKey];
              }
            }

            const backupKey = `raw_col_${colIndex}`;
            if (item[backupKey] !== undefined && item[backupKey] !== "" && item[backupKey] !== null) {
              return item[backupKey];
            }
            return fallback;
          };

          const rawSubName = String(getVal(["nameofsubscription", "subscriptionname", "subname"], 5, "Unknown"));
          
          // Category logic: lookup from masters or fallback to purpose
          let rawCategory = subNameToCategoryMap[rawSubName.toLowerCase().trim()];
          if (!rawCategory) {
            rawCategory = String(getVal(["categoryofsubscription", "categoryofsubscriptions", "purpose", "details"], 4, "Other"));
          }

          return {
            id: item.id || `sheet-${index}`,
            rowIndex: index,
            subscriptionNo: String(rawSubNo),
            companyName: String(getVal(["companyname", "company"], 3, "Unknown")),
            subscriberName: String(getVal(["subscribername", "person", "nameoftheperson"], 2, "Unknown")),
            category: rawCategory,
            subscriptionType: String(getVal(["typesofsubscriptions", "subscriptiontype"], 15, "")),
            subscriptionName: rawSubName,
            details: String(getVal(["details", "purpose", "purposeofsubscription", "remarkofpurpose"], 4, "")),
            price: parseFloat(getVal(["price", "cost", "amount"], 7, "0").toString().replace(/[^0-9.]/g, '')) || 0,
            frequency: getVal(["frequency", "freq"], 6, Frequency.MONTHLY) as Frequency,
            status,
            startDate: normalizeDate(getValWithStatus(["startdate", "planned"], 8, "")),
            endDate: normalizeDate(getValWithStatus(["enddate", "actual"], 9, "")),
            approvedOn: normalizeDate(item["approval_actual"] || item["approval_approvedon"] || ""),
            timeDelay: getValWithStatus(["timedelay", "delay"], 15, ""),
            photoUrl: String(getValWithStatus(["photourl", "photo"], 11, "")),
            createdAt: normalizeDate(rawCreatedAt),
            billingMonth: String(getVal(["billingmonth"], 20, "")),
            billingYear: parseInt(getVal(["billingyear"], 21, "0")) || undefined,
            nextRenewalDate: normalizeDate(getVal(["nextrenewaldate"], 22, "")),
            autoRenewal: getVal(["autorenewal"], 23, "").toString().toLowerCase() === 'yes',
            approvalNo: String(getVal(["approvalno", "appno"], 24, "")),
            paymentMode: String(getVal(["paymentmode"], 25, "")),
            transactionId: String(getVal(["transactionid"], 26, "")),
            insuranceDoc: String(getVal(["insurancedocument", "insurancedoc"], 27, "")),
            renewalNo: String(getVal(["renewalno", "renno"], 28, ""))
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
    const ts = normalizeDate(new Date());
    const payload = {
      sheetName: "FMS",
      action: "ADD",
      // Primary mapping based on specific header names requested
      "Timestamp": ts,
      "Subscription No.": sub.subscriptionNo,
      "Name Of The Person": sub.subscriberName,
      "Subscription Name": sub.subscriptionName,
      "Types Of Subscriptions": sub.subscriptionType || "",
      "Category Of Subscription": sub.category || "",
      "Purpose Of Subscription": sub.details,
      "Price": sub.price,
      "Freq": sub.frequency,
      "Company Name": sub.companyName,
      // Planned 1 = submission timestamp (date the form was submitted)
      "Planned 1": ts,

      // Also keeping camelCase versions for script compatibility if needed
      timestamp: ts,
      subscriptionNo: sub.subscriptionNo,
      subscriberName: sub.subscriberName,
      subscriptionName: sub.subscriptionName,
      subscriptionType: sub.subscriptionType || "",
      category: sub.category || "",
      details: sub.details,
      price: sub.price,
      frequency: sub.frequency,
      companyName: sub.companyName,
    };


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
      subscriptionNo: sub.subscriptionNo,
      "Subscription No": sub.subscriptionNo,
      "Status": sheetStatus,
      status: sheetStatus,
    };

    // Logic for Approval Section (Phase 1: Approval For Subscription)
    if (sub.status === SubscriptionStatus.PENDING_APPROVAL || 
        sub.status === SubscriptionStatus.PENDING_PAYMENT || 
        sub.status === SubscriptionStatus.REJECTED) {
      
      // Planned 1 = submission timestamp (already written on ADD, but keep for UPDATE too)
      // Do NOT overwrite Planned 1 on approval — leave it as the original submission time
      // Actual 1 = approval timestamp (only when approved; empty if pending/rejected)
      if (sub.status === SubscriptionStatus.PENDING_PAYMENT) {
        const approvalTs = normalizeDate(new Date().toISOString());
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
      // Only Actual 2 gets the payment timestamp — Planned 2 must be explicitly empty
      // to prevent the Apps Script from writing to it via generic "Planned" / "Actual" keys
      const paymentTs = normalizeDate(new Date().toISOString());
      payload["Actual 2"] = paymentTs;
      payload["Planned 2"] = "";   // explicitly blank so script does NOT touch Planned 2
      payload["Planned"] = "";     // prevent any generic mapping to Planned columns
    }
    // Logic for Billing/Active Section (Phase 3: Bill Upload)
    else if (sub.status === SubscriptionStatus.ACTIVE) {
      payload["Photo URL"] = sub.photoUrl || "";
      payload["Photo"] = sub.photoUrl || "";
      payload["Next Renewal Date"] = normalizeDate(sub.nextRenewalDate) || "";
    }
    // Logic for Renewal Restart Section (Phase 4: Renewal)
    // When renewal is submitted, the original subscription becomes EXPIRED
    // → write the renewal submission timestamp to "Actual 3"
    else if (sub.status === SubscriptionStatus.EXPIRED) {
      const renewalTs = normalizeDate(new Date().toISOString());
      payload["Actual 3"] = renewalTs;          // Renewal Restart → Actual 3
      payload["Planned 3"] = "";                // explicitly blank — do NOT touch Planned 3
      payload["Planned"] = "";                  // prevent generic mapping to any Planned column
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
    "Subscription No": sub.subscriptionNo,
    "Name Of The Perosn": sub.subscriberName,
    "Name Of The Person": sub.subscriberName,
    "Subscription Name": sub.subscriptionName,
    "Purpose Of Subscription": sub.details,
    "Price": sub.price,
    "Price ": sub.price,
    "Freq": sub.frequency,
    "Company Name": sub.companyName,
    "Planned": normalizeDate(sub.startDate) || normalizeDate(new Date()),
    "Step": "",
    "Gmail ID": "",
    "How": GOOGLE_FORM_URL,
    "Renwal Form": "",
    "Query": "",
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

// Write a log entry to the "Subscription's" sheet
export const addToSubscriptionLogSheet = async (sub: Subscription) => {
  const ts = normalizeDate(new Date());

  const payload: Record<string, any> = {
    sheetName: "Subscription's",
    action: "ADD",
    "Timestamp": ts,
    "Subscription No.": sub.subscriptionNo,
    "Subscription No": sub.subscriptionNo,
    "Subscription Name": sub.subscriptionName,
    "Price": sub.price,
    "Frequency": sub.frequency,
    "Start Date": normalizeDate(sub.startDate) || "",
    "End Date": normalizeDate(sub.endDate) || ""
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
