import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import AuthGuard from "@/components/AuthGuard";
import Index from "./pages/Index";
import SearchEngine from "./pages/SearchEngine";
import Marketplace from "./pages/Marketplace";
import Agents from "./pages/Agents";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import NotFound from "./pages/NotFound";
import JoinWaitlist from "./pages/JoinWaitlist";
import { Analytics } from "@vercel/analytics/next";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        closeOnClick
        pauseOnHover
        limit={4}
        draggable
        theme="light"
      />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<JoinWaitlist />} />
            {/* <Route path="/join-waitlist" element={<JoinWaitlist />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/login" element={<Login />} />
            <Route
              path="/search"
              element={
                <AuthGuard>
                  <SearchEngine />
                </AuthGuard>
              }
            />
            <Route
              path="/marketplace"
              element={
                <AuthGuard>
                  <Marketplace />
                </AuthGuard>
              }
            />
            <Route
              path="/agents"
              element={
                <AuthGuard>
                  <Agents />
                </AuthGuard>
              }
            /> */}
            <Route path="*" element={<JoinWaitlist />} />
          </Routes>
          {/* <Analytics /> */}
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
