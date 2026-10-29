import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import RequireAuth from './auth/RequireAuth'
import Home from './pages/Home'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Courses from './pages/Courses'
import CourseDetail from './pages/CourseDetail'
import StepPage from './pages/StepPage'
import ExamPage from './pages/ExamPage'
import MyLearning from './pages/MyLearning'
import Profile from './pages/Profile'
import VerifyCertificate from './pages/VerifyCertificate'
import Charts from './pages/Charts'
import ChartMaker from './pages/ChartMaker'
import Services from './pages/Services'
import OrganizationPage from './pages/OrganizationPage'
import TeacherHome from './pages/teacher/TeacherHome'
import TeacherCourseEdit from './pages/teacher/TeacherCourseEdit'
import AdminHome from './pages/admin/AdminHome'
import NotFound from './pages/NotFound'

export default function App() {
    return (
        <Routes>
            <Route element={<Layout />}>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/courses" element={<Courses />} />
                <Route path="/courses/:id" element={<CourseDetail />} />
                <Route path="/steps/:id" element={<StepPage />} />
                <Route path="/verify" element={<VerifyCertificate />} />
                <Route path="/verify/:code" element={<VerifyCertificate />} />
                <Route path="/services" element={<Services />} />
                {/* График гаргах нь нэвтрэлтгүй, хадгалахад л нэвтэрнэ */}
                <Route path="/charts/new" element={<ChartMaker />} />

                <Route path="/exam/:courseId" element={<RequireAuth><ExamPage /></RequireAuth>} />
                <Route path="/learning" element={<RequireAuth><MyLearning /></RequireAuth>} />
                <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
                <Route path="/charts" element={<RequireAuth><Charts /></RequireAuth>} />
                <Route path="/charts/:id" element={<RequireAuth><ChartMaker /></RequireAuth>} />
                <Route path="/dashboards/*" element={<Navigate to="/charts" replace />} />
                <Route path="/organization" element={<RequireAuth><OrganizationPage /></RequireAuth>} />

                <Route path="/teacher" element={<RequireAuth roles={['teacher', 'admin']}><TeacherHome /></RequireAuth>} />
                <Route
                    path="/teacher/courses/:id"
                    element={<RequireAuth roles={['teacher', 'admin']}><TeacherCourseEdit /></RequireAuth>}
                />
                <Route path="/admin" element={<RequireAuth roles={['admin']}><AdminHome /></RequireAuth>} />

                <Route path="*" element={<NotFound />} />
            </Route>
        </Routes>
    )
}
