export enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER'
}

export interface User {
  id: string;
  name: string;
  email: string;
  username: string;
  password?: string;
  role: UserRole;
  lastLogin?: string;
}

export enum SubscriptionStatus {
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  PENDING_PAYMENT = 'PENDING_PAYMENT',
  PAID = 'PAID',
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED'
}

export enum Frequency {
  MONTHLY = 'Monthly',
  QUARTERLY = 'Quarterly',
  HALF_YEARLY = 'Half-Yearly',
  YEARLY = 'Yearly'
}

export interface Subscription {
  id: string;
  subscriptionNo: string;
  subscriberName: string;
  subscriptionName: string;
  details: string;
  price: number;
  frequency: Frequency;
  companyName: string;
  status: SubscriptionStatus;
  startDate?: string;
  endDate?: string;
  photoUrl?: string;
  createdAt: string;
  approvedOn?: string;
  timeDelay?: number | string;
  category?: string;
  subscriptionType?: string;
  billingMonth?: string;
  billingYear?: number;
  nextRenewalDate?: string;
  autoRenewal?: boolean;
  rowIndex?: number; // sheet row position for reliable UPDATE matching
  parentSubscriptionNo?: string; // Original subscription number for renewals
  approvalNo?: string;
  paymentMode?: string;
  transactionId?: string;
  insuranceDoc?: string;
  renewalNo?: string;
  renewalCount?: number;
  planned1?: string;
  planned2?: string;
  planned3?: string;
  actual2?: string;
  auditStage?: string;
  auditRemarks?: string;
  step?: string;
  gmailId?: string;
  how?: string;
  query?: string;
}
