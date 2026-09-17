# InterviewAI – AI-Powered Job Preparation Platform

InterviewAI is a full-stack web application that I built to explore how AI can be used to make job preparation easier.

As a student, I wanted to build something more practical than a basic CRUD project. The idea was to create a platform where a user can upload a resume, provide a job description, identify skill gaps, and prepare for an interview using AI-generated questions and reports.

This project also helped me understand how a React frontend communicates with a Node.js/Express backend and how AI features can be integrated into a normal web application.

## What I Built

The application currently includes features such as:

- User registration and login
- JWT-based authentication
- Logout with token blacklisting
- Protected routes
- Resume upload and processing
- Resume information/skill extraction
- Job description analysis
- AI-based skill gap detection
- AI-generated interview questions
- Interview report generation
- Previous interview reports
- ATS-oriented resume generation
- Resume PDF generation using Puppeteer
- REST APIs for frontend-backend communication

## Tech Stack

### Frontend
- React.js
- Vite
- React Router
- Axios
- CSS

### Backend
- Node.js
- Express.js
- MongoDB
- Mongoose

### Authentication
- JSON Web Tokens (JWT)
- HTTP Cookies
- Token Blacklisting

### AI
- Gemini API

### Other Tools
- Multer
- Puppeteer
- Postman
- Git & GitHub
- VS Code

## How the Application Works

The basic flow of the application is:

1. User creates an account or logs in.
2. User uploads their resume.
3. User provides a job description.
4. The backend processes the uploaded information.
5. AI is used to analyze the resume and job requirements.
6. The application identifies possible skill gaps.
7. Interview questions are generated based on the available information.
8. An interview report is created and stored.
9. Users can view their previous reports.
10. The application can generate a resume PDF through the backend.

## Project Structure

The project is divided into two main parts:

```text
InterviewAI/
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── context/
│   │   ├── hooks/
│   │   ├── services/
│   │   └── ...
│   └── ...
│
├── backend/
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   ├── middleware/
│   ├── services/
│   └── ...
│
└── README.md
