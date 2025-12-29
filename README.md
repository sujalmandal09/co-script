# CoScript

A real-time collaborative code editor built with React and Node.js.

## Features

- Real-time collaborative code editing
- Multiple language support
- Socket.io for real-time synchronization
- MySQL database integration

## Project Structure

```
CoScript/
├── client/          # React frontend
├── Server/          # Node.js backend with Socket.io
└── README.md
```

## Setup

### Prerequisites

- Node.js (v14 or higher)
- MySQL database

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd CoScript
```

2. Install server dependencies:
```bash
cd Server
npm install
```

3. Install client dependencies:
```bash
cd ../client
npm install
```

4. Configure environment variables:
   - Create a `.env` file in the `Server` directory
   - Add your database configuration

### Running the Application

1. Start the server:
```bash
cd Server
npm start
```

2. Start the client:
```bash
cd client
npm start
```

## Technologies Used

- **Frontend**: React, Socket.io-client
- **Backend**: Node.js, Express, Socket.io
- **Database**: MySQL
- **Real-time Communication**: Socket.io

## License

MIT
