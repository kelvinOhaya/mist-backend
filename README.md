# Mist Backend

This is the backend server for **Mist**, a real-time chat application built with Node.js, Express, Socket.IO, and MongoDB.

## Features

- Real-time messaging using Socket.IO
- User authentication and authorization
- Group chat functionality
- Direct messaging (DM) support
- File uploads (profile pictures)
- Join code system for chat rooms
- Online user tracking
- Message persistence with MongoDB

## Project Structure

```
backend/
├── config/             # Configuration files
├── controllers/        # Request handlers
├── middleware/         # Express middleware
├── models/            # MongoDB schemas
├── routes/            # API routes
├── sockets/           # Socket.IO event handlers
├── utils/             # Utility functions
├── io.js             # Socket.IO setup
└── server.js         # Express server setup
```

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- MongoDB
- Cloudinary account (for file uploads)

### Installation

1. Clone the repository
2. Install dependencies:

   ```bash
   npm install
   ```

3. Configure environment variables (see project documentation)
4. Start the development server:

   ```bash
   npm run dev
   ```

## Security Features

The application implements several security measures:

- JWT-based authentication
- Secure session management
- Protected API endpoints
- Input validation and sanitization
- Rate limiting
- Secure WebSocket connections
- File upload validation
- XSS protection
- CORS configuration

## Real-time Features

The application uses Socket.IO for real-time functionality including:

- Instant messaging
- Room state synchronization
- User presence updates
- Profile updates
- Member activity tracking

## Development

For security reasons, detailed API documentation, environment variables, and endpoint specifications are maintained privately. Developers who need access to the complete documentation should:

1. Be authorized team members
2. Request access through proper channels
3. Follow security protocols for handling sensitive information

## Note on Production Deployment

When deploying to production:

- Use secure environment variables
- Enable all security middleware
- Configure proper CORS settings
- Set up rate limiting
- Use HTTPS
- Configure secure WebSocket connections
- Monitor for suspicious activities

For deployment assistance or access to detailed documentation, please contact the project maintainers.
