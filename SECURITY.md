# Security Policy

## Security Measures Implemented

### Input Validation
- **File Upload**: Only PDF files accepted, 50MB size limit
- **Text Input**: 5MB maximum text length
- **ID Sanitization**: All IDs sanitized to alphanumeric characters only
- **Numeric Validation**: All financial metrics validated for valid numbers

### Security Headers
- `X-Content-Type-Options: nosniff` - Prevents MIME type sniffing
- `X-Frame-Options: DENY` - Prevents clickjacking attacks
- `X-XSS-Protection: 1; mode=block` - Enables XSS filtering
- `Referrer-Policy: strict-origin-when-cross-origin` - Controls referrer information

### Rate Limiting
- 100 requests per minute per IP address
- Automatic cleanup of rate limit data
- 429 status code returned when limit exceeded

### Data Handling
- In-memory storage (no persistent data storage)
- No sensitive data logged
- Automatic memory cleanup
- No external API calls (no data leakage)

### File Processing
- PDF parsing in isolated process
- Memory limits enforced
- Error handling prevents crashes
- No file system writes

### API Security
- CORS enabled with proper configuration
- JSON payload size limited to 10MB
- Input sanitization on all endpoints
- Proper error messages (no stack traces exposed)

## Reporting a Vulnerability

If you discover a security vulnerability, please email: security@loanlens.example.com

Please include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

## Best Practices for Deployment

### Production Deployment
1. Use HTTPS only
2. Set up proper CORS origins (not wildcard)
3. Use environment variables for configuration
4. Implement proper logging and monitoring
5. Use a reverse proxy (nginx/Apache)
6. Set up database instead of in-memory storage
7. Implement authentication and authorization
8. Use helmet.js for additional security headers
9. Regular security audits
10. Keep dependencies updated

### Environment Variables
```bash
PORT=3456
NODE_ENV=production
CORS_ORIGIN=https://yourdomain.com
MAX_FILE_SIZE=52428800
RATE_LIMIT=100
```

## Dependencies Security

Run regular security audits:
```bash
npm audit
npm audit fix
```

## License

This security policy is part of the LoanLens project.
