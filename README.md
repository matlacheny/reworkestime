# Estime App

Estime is an app made to analyse mobility data built with Tauri, combining web technologies (HTML, CSS, JS) with a Rust-powered native application.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v16 or newer)
- [Rust](https://www.rust-lang.org/tools/install) (latest stable)
- [Tauri CLI](https://tauri.app/start/prerequisites/)

### Clone the Repository

```bash
git clone https://github.com/matlacheny/reworkestime.git
```

### Install Dependencies

```bash
npm install
```

### Development

Run the application in development mode:

```bash
npm run dev
```

This will:
1. Build the network API from source
2. Launch the Tauri application with hot-reload support

### Building for Production

To create a production build:

```bash
npm run build
```

This will:
1. Compile the network API into a standalone executable
2. Build the Tauri application
3. Create executable files in the `src-tauri/target/release` directory

Note: The network API is compiled using `pkg` and will be available as `network-api.exe` in the project root.

## How the Application Works

### Architecture Overview

Estime App is built using a hybrid architecture:

1. **Frontend**: Web-based interface using HTML, CSS, and JavaScript
2. **Network API**: Node.js application (packaged as an executable) for network communication
3. **Tauri Shell**: Rust-based shell that runs the frontend and launches the network API

### Communication Flow

#### Frontend to Backend Communication

The frontend communicates with the backend through:

1. **WebSocket**: Real-time communication between clients and servers using the WebSocket protocol
   - Handles real-time updates, notifications, and synchronization
   - Manages device discovery on the network

2. **Tauri API**: Direct communication with the Rust backend through the Tauri API
   - Used for system-level operations and file access
   - Manages application lifecycle and window state

#### Network Communication

The application uses a custom peer-to-peer networking layer that:

1. Discovers other instances of the application on the local network
2. Establishes connections between controller devices and dashboard displays
3. Synchronizes time tracking data and estimates across devices

## Project Structure

- `src/`: Frontend web application
- `src-tauri/`: Rust backend and application configuration
- `src-tauri/src/main.rs`: Entry point for the Rust application
- `src-tauri/src/main.js`: Network API implementation (Node.js)
- `network-api.exe`: Packaged version of the network API

## Additional Resources

- [Tauri Documentation](https://tauri.app/start/)
- [Rust Documentation](https://www.rust-lang.org/learn)
