-- Add firstLoginAt field to User table
ALTER TABLE "User" ADD COLUMN "firstLoginAt" TIMESTAMP(3);

-- Create PasswordResetToken table
CREATE TABLE "PasswordResetToken" (
    "id" SERIAL NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PasswordResetToken_token_key" UNIQUE ("token")
);

-- Create indexes for efficient queries
CREATE INDEX "PasswordResetToken_email_idx" ON "PasswordResetToken"("email");
CREATE INDEX "PasswordResetToken_expiresAt_idx" ON "PasswordResetToken"("expiresAt");
