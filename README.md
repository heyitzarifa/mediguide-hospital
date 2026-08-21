🏥 MediGuide Hospital

🌟 About the Project

MediGuide Hospital is a smart hospital management and navigation platform designed to make healthcare services more accessible, organized, and user-friendly.

The platform connects patients, hospital staff, visitors, and management through a single digital system. It helps users navigate hospital facilities, manage appointments and queues, access prescriptions and medication information, and interact with hospital services through an intuitive interface.

✨ Key Features

👤 Patient Services

- Patient dashboard
- Appointment management
- Queue and token tracking
- Prescription management
- Medication records and reminders
- Hospital navigation
- Healthcare information access

👩‍⚕️ Staff Services

- Staff dashboard
- Patient and queue management
- Appointment information
- Department and doctor information
- Hospital operational updates

🏥 Hospital Management

- Hospital onboarding
- Hospital information management
- QR-based hospital identification
- Department and doctor management
- Operational alerts
- Hospital settings

🧭 Smart Hospital Navigation

- Search hospital locations
- Find departments and facilities
- Floor-based navigation
- Route calculation between hospital locations
- Estimated walking distance and time

🔐 Authentication & Roles

The system supports role-based access for:

- Patients
- Staff
- Visitors
- Management

🛠️ Tech Stack

Frontend

- React
- TypeScript
- Vite
- Tailwind CSS
- React Router
- Lucide React
- Tesseract.js

Backend

- Python
- Flask
- Flask-CORS

Database

- MongoDB
- PyMongo

📂 Project Structure

mediguide-hospital/
├── backend/
│   ├── app.py
│   └── database.py
├── public/
├── src/
├── index.html
├── package.json
├── tailwind.config.js
├── vite.config.ts
└── README.md

🚀 Getting Started

Frontend

Clone the repository:

git clone https://github.com/heyitzarifa/mediguide-hospital.git

Navigate to the project:

cd mediguide-hospital

Install dependencies:

npm install

Start the development server:

npm run dev

Backend

Navigate to the backend folder:

cd backend

Install the required Python dependencies and configure the MongoDB connection using environment variables.

The backend uses Flask and connects to MongoDB through PyMongo.

🔧 Environment Variables

The backend uses environment variables for configuration.

Example:

MONGODB_URI=your_mongodb_connection_string
DB_NAME=smartcare_db
SECRET_KEY=your_secret_key
FRONTEND_BASE_URL=http://localhost:5173

Do not commit real credentials, API keys, database passwords, or secret keys to the repository.

🎯 Project Goal

The goal of MediGuide Hospital is to improve the hospital experience for patients, visitors, staff, and management by bringing important hospital services into one connected digital platform.

Instead of relying on multiple disconnected processes, MediGuide provides a centralized interface for navigation, appointments, queues, prescriptions, medication reminders, hospital information, and management operations.

🚀 Future Improvements

- Real-time hospital notifications
- Advanced appointment scheduling
- Improved indoor navigation
- Mobile application support
- Enhanced AI-assisted healthcare support
- More hospital integrations
- Improved accessibility features
- Real-time data synchronization

👥 Team Members

Team MediGuide

- Arifa
- Nabeela Fathima
- Yogalakshmi

🏆 Hackathon Project


MediGuide Hospital was developed as a hackathon project with the goal of creating a practical, accessible, and technology-driven solution for modern hospital management and patient experience.

---

Built with ❤️ by Team MediGuide
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.
