import { User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTheme } from "@/components/theme-provider";
import { useState } from "react";

interface LoginProps {
  onLogin: (user: { name: string; role: string; isAdmin: boolean }) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const { theme, setTheme } = useTheme();
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState(false);

  const loginAsAli = () => {
    onLogin({ name: "Ali", role: "Viewer", isAdmin: false });
  };

  const showPasswordPrompt = () => {
    setShowPasswordModal(true);
    setPassword("");
    setPasswordError(false);
  };

  const verifyPassword = () => {
    if (password === "0000") {
      onLogin({ name: "Alle", role: "Admin", isAdmin: true });
      setShowPasswordModal(false);
    } else {
      setPasswordError(true);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      verifyPassword();
    }
  };

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-900">
      <Card className="w-full max-w-md">
        <CardContent className="p-8">
          {/* Theme Toggle */}
          <div className="flex justify-end mb-6">
            <Button
              variant="outline"
              size="icon"
              onClick={toggleTheme}
              className="bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600"
            >
              {theme === "dark" ? (
                <i className="fas fa-sun text-yellow-500" />
              ) : (
                <i className="fas fa-moon text-blue-400" />
              )}
            </Button>
          </div>

          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
              Investment Tracker
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              Select your account to continue
            </p>
          </div>

          <div className="space-y-4">
            {/* Ali User Card */}
            <div
              onClick={loginAsAli}
              className="cursor-pointer group bg-slate-50 dark:bg-slate-700 rounded-xl p-6 hover:bg-slate-100 dark:hover:bg-slate-600 transition-all duration-200 border-2 border-transparent hover:border-primary"
            >
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center">
                  <User className="text-white" size={20} />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900 dark:text-white">Ali</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Viewer Access</p>
                </div>
                <i className="fas fa-arrow-right text-slate-400 group-hover:text-primary transition-colors" />
              </div>
            </div>

            {/* Alle User Card */}
            <div
              onClick={showPasswordPrompt}
              className="cursor-pointer group bg-slate-50 dark:bg-slate-700 rounded-xl p-6 hover:bg-slate-100 dark:hover:bg-slate-600 transition-all duration-200 border-2 border-transparent hover:border-primary"
            >
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center">
                  <i className="fas fa-user-crown text-white text-lg" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900 dark:text-white">Alle</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Admin Access</p>
                </div>
                <i className="fas fa-lock text-slate-400 group-hover:text-primary transition-colors" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Password Modal */}
      <Dialog open={showPasswordModal} onOpenChange={setShowPasswordModal}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Admin Authentication</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <Input
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={handleKeyPress}
              className="focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            
            {passwordError && (
              <p className="text-sm text-red-600 dark:text-red-400">
                Incorrect password. Please try again.
              </p>
            )}
            
            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={() => setShowPasswordModal(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button onClick={verifyPassword} className="flex-1">
                Login
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
