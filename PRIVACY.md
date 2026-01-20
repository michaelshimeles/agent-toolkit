# Privacy Policy

This document describes the data collection and privacy practices for MCP Hub Toolkit.

## Data We Collect

### User Account Data

When you create an account, we collect:
- Email address (via Clerk authentication)
- Name (optional)
- Profile image URL (optional)

This data is used to:
- Authenticate your identity
- Display your profile information
- Associate your data with your account

### Integration Data

When you connect third-party integrations (GitHub, Linear, Notion, Slack), we collect:
- OAuth access tokens (encrypted at rest)
- Token expiration timestamps

This data is used to:
- Execute MCP tools on your behalf
- Maintain your integration connections

### Analytics Data

We use Vercel Analytics to collect:
- Page views
- Anonymous usage patterns
- Performance metrics

This data is:
- Aggregated and anonymized
- Used to improve the application
- Not sold to third parties

## Data We Do NOT Collect

- Passwords (authentication handled by Clerk)
- Payment information
- Content from your connected integrations
- Personal data beyond what's listed above

## Data Storage

- **User data**: Stored in Convex database
- **OAuth tokens**: Encrypted using AES-256-CBC before storage
- **Session data**: Managed by Clerk (see [Clerk's Privacy Policy](https://clerk.com/privacy))

## Data Retention

- Account data is retained while your account is active
- OAuth tokens are automatically refreshed or deleted when expired
- You can request deletion of your data at any time

## Third-Party Services

This application uses the following third-party services:

| Service | Purpose | Privacy Policy |
|---------|---------|----------------|
| Clerk | Authentication | [Link](https://clerk.com/privacy) |
| Convex | Database | [Link](https://www.convex.dev/privacy) |
| Vercel | Hosting & Analytics | [Link](https://vercel.com/legal/privacy-policy) |

## Your Rights

You have the right to:
- Access your personal data
- Correct inaccurate data
- Delete your account and data
- Export your data
- Opt out of analytics (use browser Do Not Track)

## Data Security

We implement security measures including:
- Encryption of sensitive data at rest
- HTTPS for all communications
- Regular security audits
- Secure OAuth token handling

## Self-Hosted Deployments

If you self-host this application:
- You are responsible for data protection
- Configure your own analytics preferences
- Implement appropriate security measures
- Review third-party service agreements

## Contact

For privacy-related questions or data requests, contact us at [privacy@example.com](mailto:privacy@example.com).

## Changes to This Policy

We may update this policy periodically. Significant changes will be announced via the repository.

Last updated: January 2026
