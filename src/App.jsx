import { Routes, Route, Navigate } from 'react-router-dom'
import Feed from './pages/Feed.jsx'
import Submit from './pages/Submit.jsx'
import StaffLogin from './pages/StaffLogin.jsx'
import StaffLayout from './pages/StaffLayout.jsx'
import StaffQuickPost from './pages/StaffQuickPost.jsx'
import StaffModerate from './pages/StaffModerate.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Feed />} />
      <Route path="/submit" element={<Submit />} />
      <Route path="/staff/login" element={<StaffLogin />} />
      <Route path="/staff" element={<StaffLayout />}>
        <Route index element={<Navigate to="post" replace />} />
        <Route path="post" element={<StaffQuickPost />} />
        <Route path="moderate" element={<StaffModerate />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
