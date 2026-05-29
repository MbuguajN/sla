-- Add notification type for board activity
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'BOARD_UPDATED';
