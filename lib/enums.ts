export enum Role {
    ADMIN = 'ADMIN',
    CEO = 'CEO',
    HR = 'HR',
    MANAGER = 'MANAGER',
    EMPLOYEE = 'EMPLOYEE'
}

export enum TaskStatus {
    PENDING = 'PENDING',
    RECEIVED = 'RECEIVED',
    IN_PROGRESS = 'IN_PROGRESS',
    REVIEW = 'REVIEW',
    COMPLETED = 'COMPLETED',
    AWAITING_INFO = 'AWAITING_INFO',
    DISMISSED = 'DISMISSED'
}

export enum SlaTier {
    URGENT = 'URGENT',
    STANDARD = 'STANDARD',
    LOW = 'LOW'
}

export enum DepartmentName {
    BUSINESS_DEVELOPMENT = 'BUSINESS_DEVELOPMENT',
    MEDIA = 'MEDIA',
    CLIENT_SERVICE = 'CLIENT_SERVICE',
    TECHNOLOGY = 'TECHNOLOGY',
    CREATIVE = 'CREATIVE',
    CONTENT = 'CONTENT',
    ACCOUNTS = 'ACCOUNTS'
}

export enum LeaveType {
    ANNUAL = 'ANNUAL',
    SICK = 'SICK',
    PERSONAL = 'PERSONAL',
    MATERNITY = 'MATERNITY',
    PATERNITY = 'PATERNITY',
    OTHER = 'OTHER'
}

export enum LeaveStatus {
    PENDING = 'PENDING',
    APPROVED = 'APPROVED',
    DENIED = 'DENIED'
}

export enum SuggestionCategory {
    COMPLAINT = 'COMPLAINT',
    REQUEST = 'REQUEST',
    SUGGESTION = 'SUGGESTION',
    FEEDBACK = 'FEEDBACK'
}

export enum SuggestionStatus {
    OPEN = 'OPEN',
    REVIEWED = 'REVIEWED',
    RESOLVED = 'RESOLVED'
}

export enum ITSupportPriority {
    LOW = 'LOW',
    NORMAL = 'NORMAL',
    HIGH = 'HIGH',
    URGENT = 'URGENT'
}

export enum ITSupportStatus {
    OPEN = 'OPEN',
    IN_PROGRESS = 'IN_PROGRESS',
    RESOLVED = 'RESOLVED',
    CLOSED = 'CLOSED'
}
