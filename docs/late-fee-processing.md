# Late Fee Processing System

This document explains how to set up and use the automated late fee processing system that runs daily at midnight to check for overdue fees.

## Overview

The late fee processing system automatically:
1. Checks for student fees that have passed their due date
2. Creates entries in the `studentLateFees` collection
3. Updates the status of overdue fees in the `studentFee` collection
4. Applies late fee amounts based on the configured late fee policies

## API Endpoint

**URL:** `/api/cron/process-late-fees`
**Method:** `POST` (also accepts `GET` for manual testing)
**Authentication:** Bearer token using `CRON_SECRET`

## Setup Instructions

### 1. Environment Configuration

Add the following environment variable to your `.env.local` file:

```bash
CRON_SECRET=your-secure-random-string-here
```

**Important:** Use a strong, random string for the CRON_SECRET to secure your cron endpoint.

### 2. Manual Testing

You can test the late fee processing manually by making a request to the API:

```bash
curl -X POST \
  -H "Authorization: Bearer your-secure-random-string-here" \
  -H "Content-Type: application/json" \
  http://localhost:3000/api/cron/process-late-fees
```

### 3. Setting up Automated Cron Job

#### Option A: Using the Setup Script (Linux/macOS)

1. Make the script executable:
   ```bash
   chmod +x scripts/setup-cron.sh
   ```

2. Edit the script to update the configuration:
   ```bash
   # Update these variables in scripts/setup-cron.sh
   API_URL="https://your-domain.com/api/cron/process-late-fees"
   CRON_SECRET="your-secure-random-string-here"
   ```

3. Install the cron job:
   ```bash
   ./scripts/setup-cron.sh install
   ```

4. Verify the cron job is installed:
   ```bash
   ./scripts/setup-cron.sh show
   ```

#### Option B: Manual Cron Setup

1. Open your crontab:
   ```bash
   crontab -e
   ```

2. Add the following line to run daily at midnight:
   ```bash
   0 0 * * * /usr/bin/curl -X POST -H 'Authorization: Bearer your-secure-random-string-here' -H 'Content-Type: application/json' https://your-domain.com/api/cron/process-late-fees >> /var/log/late-fees-cron.log 2>&1
   ```

#### Option C: Using External Cron Services

For production environments, consider using external cron services like:
- **Vercel Cron Jobs** (if deployed on Vercel)
- **GitHub Actions** with scheduled workflows
- **AWS CloudWatch Events**
- **Google Cloud Scheduler**

Example GitHub Actions workflow (`.github/workflows/late-fees.yml`):

```yaml
name: Process Late Fees
on:
  schedule:
    - cron: '0 0 * * *'  # Daily at midnight UTC
  workflow_dispatch:  # Allow manual trigger

jobs:
  process-late-fees:
    runs-on: ubuntu-latest
    steps:
      - name: Call Late Fee API
        run: |
          curl -X POST \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            -H "Content-Type: application/json" \
            ${{ secrets.API_URL }}/api/cron/process-late-fees
```

## How It Works

### 1. Due Date Checking
The system finds all `StudentFee` records where:
- `dueDate` is less than today
- `status` is 'not_started' or 'pending' (not paid or already overdue)
- `isActive` is true

### 2. Late Fee Application
For each overdue fee:
- Finds the applicable `LateFee` policy based on student's class and academic year
- Creates a new `StudentLateFee` entry with:
  - `studentId`: Reference to the student
  - `studentFeeId`: Reference to the overdue fee
  - `lateFeeAmount`: Amount from the late fee policy
  - `appliedOn`: Current date
  - `reason`: Descriptive reason with days overdue
  - `isWaived`: false (can be manually changed later)

### 3. Status Update
Updates the `StudentFee` status to 'overdue'

## API Response Format

### Success Response
```json
{
  "success": true,
  "message": "Late fee processing completed",
  "processedDate": "2024-01-15T00:00:00.000Z",
  "totalOverdueFees": 25,
  "successfullyProcessed": 23,
  "errors": 2,
  "summary": {
    "newLateFees": 23,
    "statusUpdates": 23
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": "Failed to process late fees",
  "details": "Database connection failed"
}
```

## Logging and Monitoring

### Log Files
- Cron logs are saved to `/var/log/late-fees-cron.log`
- Application logs include detailed processing information

### Console Output
The system logs detailed information about:
- Number of overdue fees found
- Late fee policies applied
- Students processed
- Any errors encountered

## Troubleshooting

### Common Issues

1. **Unauthorized Error (401)**
   - Check that `CRON_SECRET` matches in both environment and cron job
   - Verify the Authorization header format

2. **No Late Fees Applied**
   - Ensure late fee policies are created for the relevant classes
   - Check that `LateFee` entries have `isActive: true`

3. **Database Connection Issues**
   - Verify MongoDB connection string
   - Check database server status

4. **Cron Job Not Running**
   - Verify cron service is running: `systemctl status cron`
   - Check cron logs: `tail -f /var/log/cron`

### Manual Execution
You can manually trigger the process for testing:
```bash
curl -X GET \
  -H "Authorization: Bearer your-cron-secret" \
  http://localhost:3000/api/cron/process-late-fees
```

## Security Considerations

1. **Protect the CRON_SECRET**: Use a strong, random string
2. **HTTPS**: Always use HTTPS in production
3. **Access Logs**: Monitor access to the cron endpoint
4. **Rate Limiting**: Consider implementing rate limiting for the endpoint

## Database Schema Requirements

Ensure your database has the following collections with proper indexes:
- `studentFee` - with indexes on `status`, `dueDate`, `studentId`
- `studentLateFee` - with indexes on `studentId`, `studentFeeId`
- `lateFee` - with indexes on `classId`, `academicYearId`, `isActive`

## Integration with Fee Management

The late fee processing integrates with your existing fee management system:
- Late fees appear in the student fee dashboard
- Payment processing includes late fee amounts
- Reports can include late fee statistics
- Students receive notifications about overdue fees (if notification system is implemented)

## Future Enhancements

Potential improvements to consider:
- Email notifications to students about overdue fees
- Escalation policies for severely overdue payments
- Partial late fee waivers based on payment history
- Integration with SMS notification systems
- Dashboard for late fee analytics and reporting 