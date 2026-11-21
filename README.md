# Campus Track - Student Management System

Stack: React + Vite (JavaScript) · React Router DOM · Lucide React · Recharts · Node.js · Express · MongoDB · Mongoose · JWT · bcryptjs

## Setup

1. **MongoDB** - local MongoDB (Compass) ya MongoDB Atlas, dono chalte hain.
2. **Install**
   ```bash
   npm run install:all
   ```
3. **Backend config** - `server/.env.example` ko copy karke `server/.env` banayein aur `MONGO_URI` + `JWT_SECRET` set karein.
4. **Demo data + logins**
   ```bash
   npm run seed
   ```
   | Role | Email | Password |
   |------|-------|----------|
   | Admin | admin@campus.com | Admin@123 |
   | Teacher | teacher@campus.com | Teacher@123 |
   | Student | student@campus.com | Student@123 |
5. **Run** (do alag terminals)
   ```bash
   npm run server    # http://localhost:5000
   npm run client    # http://localhost:5173
   ```

Production: `npm run build`, phir `NODE_ENV=production` ke saath server chalayein - wo `client/dist` khud serve karta hai.

## Phases kahan hain

| Phase | Frontend | Backend |
|-------|----------|---------|
| 1 Frontend foundation | `components/layout`, `components/ui`, `index.css` | - |
| 2 Auth & roles | `Login`, `Register`, `ProtectedRoute`, `AuthContext` | `routes/auth.js`, `middleware/auth.js`, `routes/users.js` |
| 3 Students | `pages/Students.jsx` | `routes/students.js` |
| 4 Teachers & staff | `pages/Teachers.jsx` | `routes/teachers.js` |
| 5 Courses/classes/subjects | `pages/Academics.jsx` | `routes/academic.js` |
| 6 Attendance | `pages/Attendance.jsx` | `routes/attendance.js` |
| 7 Fees & payments | `pages/Fees.jsx` | `routes/fees.js` |
| 8 Exams & results | `pages/Exams.jsx` | `routes/exams.js` |
| 9 Timetable | `pages/Timetable.jsx` | `routes/timetable.js` |
| 10 Notifications & communication | `Announcements`, `Messages`, navbar bell | `routes/comms.js` |
| 11 Reports & settings | `Reports`, `Users`, `Settings` | `routes/reports.js`, `routes/settings.js` |
| 12 Integration & security | role guards, helmet, rate-limit, validation | `server.js`, `middleware/error.js` |

## Important notes

- **Student login ko student record se link karne ke liye email same honi chahiye.** Admin Students page par student add karte waqt wahi email dein jo student ke login account ki hai.
- Public registration sirf **student** account banati hai. Admin/Teacher accounts admin "User Management" se banata hai. Teacher login ko Teacher record se link karne ke liye bhi email same rakhein.
- Grades: A+ ≥90 (4.0), A ≥80 (3.5), B ≥70 (3.0), C ≥60 (2.0), D ≥50 (1.0), F <50 (0). GPA credit hours se weighted hai.
- Attendance: "Late" ko attended count kiya jata hai. Minimum % Settings se badal sakte hain.
- Extra packages (stack ke ilawa, security ke liye): `helmet`, `express-rate-limit`, `nodemon` (dev).
