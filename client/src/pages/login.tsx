import { User, Sun, Moon, ChevronRight, Shield } from "lucide-react";
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
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <Card className="w-full max-w-md shadow-2xl border-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
        <CardContent className="p-8 relative">
          {/* Theme Toggle - positioned in top right corner */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="absolute top-4 right-4 h-8 w-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors opacity-70 hover:opacity-100"
            data-testid="button-theme-toggle"
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4 text-yellow-500" />
            ) : (
              <Moon className="h-4 w-4 text-blue-400" />
            )}
          </Button>

          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent mb-2">
              Investment Tracker
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              Scegli il tuo account per continuare
            </p>
          </div>

          <div className="space-y-3">
            {/* Ali User Card */}
            <div
              onClick={loginAsAli}
              className="cursor-pointer group bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-700 dark:to-slate-600 rounded-2xl p-6 hover:shadow-lg hover:scale-[1.02] transition-all duration-300 border border-slate-200 dark:border-slate-600 hover:border-blue-300 dark:hover:border-blue-500"
              data-testid="card-login-ali"
            >
              <div className="flex items-center space-x-4">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-blue-200 dark:group-hover:shadow-blue-900 transition-shadow">
                  <User className="text-white" size={22} />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">Ali</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">Accesso Visualizzazione</p>
                </div>
                <ChevronRight className="text-slate-400 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" size={20} />
              </div>
            </div>

            {/* Alle User Card */}
            <div
              onClick={showPasswordPrompt}
              className="cursor-pointer group bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-700 dark:to-slate-600 rounded-2xl p-6 hover:shadow-lg hover:scale-[1.02] transition-all duration-300 border border-slate-200 dark:border-slate-600 hover:border-emerald-300 dark:hover:border-emerald-500"
              data-testid="card-login-alle"
            >
              <div className="flex items-center space-x-4">
                <div className="w-14 h-14 bg-gradient-to-br from-emerald-400 via-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-emerald-200 dark:group-hover:shadow-emerald-900 transition-shadow">
                  <Shield className="text-white" size={22} />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">Alle</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">Accesso Amministratore</p>
                </div>
                <Shield className="text-slate-400 group-hover:text-emerald-500 group-hover:scale-110 transition-all" size={18} />
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
