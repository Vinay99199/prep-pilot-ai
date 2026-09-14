import { RouterProvider } from "react-router"
import { router } from "./app.routes.jsx"
import { AuthProvider } from "./features/auth/auth.provider.jsx"
import { InterviewProvider } from "./features/interview/interview.provider.jsx"
import { NotificationProvider } from "./features/notifications/notification.provider.jsx"

function App() {

  return (
    <NotificationProvider>
      <AuthProvider>
        <InterviewProvider>
          <RouterProvider router={router} />
        </InterviewProvider>
      </AuthProvider>
    </NotificationProvider>
  )
}

export default App
