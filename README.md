# ClaimsPro - Construction Contract Management PWA

A secure, single-admin Progressive Web App for managing construction contracts and progress claims. Built to replace Excel-based workflows with offline functionality, PDF exports, and intelligent editing features.

## Features

### Core Functionality
- **Single Admin Access** - Secure authentication with password protection and auto-lock after 5 minutes of inactivity
- **Contract Management** - Create and manage construction contracts with client information and template line items
- **Progress Claims** - Generate claims using contract templates, clone previous claims, or start from scratch
- **PDF Export** - Generate professional assessment reports and invoices
- **File Attachments** - Upload and manage documents, photos, and files for each claim
- **Offline Support** - Full functionality without internet connection using IndexedDB storage

### Technical Features
- **Progressive Web App** - Installable on mobile and desktop devices
- **Offline-First Architecture** - Service worker caching for complete offline functionality
- **Responsive Design** - Works seamlessly on desktop, tablet, and mobile devices
- **Real-time Calculations** - Automatic percentage and dollar amount calculations
- **Data Export/Import** - JSON backup and restore functionality
- **Change Tracking** - Complete audit log of all claim modifications

## Tech Stack

- **Frontend**: React 18 with TypeScript
- **Styling**: Tailwind CSS with shadcn/ui components
- **Data Storage**: IndexedDB with idb wrapper
- **PDF Generation**: jsPDF with autotable
- **Forms**: React Hook Form with Zod validation
- **Authentication**: bcryptjs for password hashing
- **Build Tool**: Vite
- **PWA**: Service Worker with Workbox patterns

## Getting Started

### Prerequisites
- Node.js 18 or higher
- npm or yarn package manager

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/claimspro-pwa.git
cd claimspro-pwa
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser to `http://localhost:5000`

### Default Admin Access
- **Password**: `admin123` (change this in production)

## Usage

### Contract Management
1. Log in with admin credentials
2. Create a new contract with client details and contract value
3. Set up template line items for standard construction phases
4. Configure GST rate and other contract parameters

### Progress Claims
1. Select a contract from the sidebar
2. Create a new claim using one of three options:
   - **Contract Template**: Start with predefined line items
   - **Clone Last Claim**: Copy previous claim and update percentages
   - **Blank Claim**: Start fresh and add items manually
3. Update percentage completion for each line item
4. Add file attachments as needed
5. Export assessment PDF or generate invoice when approved

### Data Management
- **Export**: Download complete data backup as JSON
- **Offline**: All features work without internet connection
- **Sync**: Automatic synchronization when connection is restored

## Project Structure

```
├── client/                 # Frontend React application
│   ├── public/            # Static assets and PWA manifests
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── lib/           # Utility functions and services
│   │   ├── pages/         # Page components
│   │   └── types/         # TypeScript type definitions
├── server/                # Express.js backend
├── shared/                # Shared schemas and types
└── package.json
```

## Key Components

### Authentication
- Session-based authentication with configurable timeout
- Password hashing with bcryptjs
- Activity monitoring for auto-logout

### Data Models
- **Contract**: Project details, client info, template items
- **Claim**: Progress claim with line items and attachments
- **LineItem**: Individual work items with percentage tracking
- **Attachment**: File uploads with metadata

### Calculations
- Automatic calculation of claim amounts based on percentage completion
- GST calculations with configurable rates
- Contract progress tracking and validation
- Sanity checks for data integrity

## Deployment

### Production Build
```bash
npm run build
```

### Environment Variables
Create a `.env` file for production:
```env
VITE_ADMIN_PASSWORD=your_secure_password_here
```

### PWA Installation
The app can be installed on devices supporting PWA:
- Desktop: Chrome, Edge, Safari
- Mobile: iOS Safari, Android Chrome
- Appears as native app with offline capabilities

## Security Considerations

- Change default admin password in production
- Use HTTPS in production for PWA features
- Regular backup of IndexedDB data
- Session timeout for automatic logout

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support or questions, please open an issue on GitHub.

---

Built with ❤️ for the construction industry