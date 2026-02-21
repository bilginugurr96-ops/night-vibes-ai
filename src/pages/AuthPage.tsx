import { useState } from "react";
import { Eye, EyeOff, Sparkles, Mail, Lock, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

const AuthPage = () => {
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (mode === "forgot") {
      const { error } = await import("@/integrations/supabase/client").then(({ supabase }) =>
        supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        })
      );
      if (error) {
        toast({ title: "Hata", description: error.message, variant: "destructive" });
      } else {
        setForgotSent(true);
      }
      setLoading(false);
      return;
    }

    if (mode === "signup") {
      if (!displayName.trim()) {
        toast({ title: "Hata", description: "İsim girmelisiniz", variant: "destructive" });
        setLoading(false);
        return;
      }
      const { error } = await signUp(email, password, displayName);
      if (error) {
        toast({ title: "Kayıt hatası", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Hesap oluşturuldu! 🎉", description: "E-posta adresinizi onaylayın." });
        setMode("login");
      }
    } else {
      const { error } = await signIn(email, password);
      if (error) {
        toast({ title: "Giriş hatası", description: "E-posta veya şifre hatalı", variant: "destructive" });
      } else {
        navigate("/");
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      {/* Logo */}
      <div className="text-center mb-10 animate-slide-up">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-neon flex items-center justify-center neon-glow mb-4">
          <Sparkles className="w-8 h-8 text-primary-foreground" />
        </div>
        <h1 className="font-display text-4xl font-bold text-gradient">NightHub</h1>
        <p className="text-muted-foreground text-sm mt-1">Gece hayatını keşfet</p>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm glass rounded-3xl p-6 animate-fade-in-up">
        {mode === "forgot" ? (
          forgotSent ? (
            <div className="text-center py-4">
              <Mail className="w-12 h-12 text-primary mx-auto mb-3" />
              <h2 className="font-display text-xl font-bold text-foreground mb-2">E-posta Gönderildi</h2>
              <p className="text-sm text-muted-foreground mb-4">Şifre sıfırlama linki e-postanıza gönderildi.</p>
              <button onClick={() => { setMode("login"); setForgotSent(false); }} className="text-primary text-sm font-medium">
                ← Giriş yap
              </button>
            </div>
          ) : (
            <>
              <h2 className="font-display text-xl font-bold text-foreground mb-1">Şifreni Unuttun mu?</h2>
              <p className="text-sm text-muted-foreground mb-5">E-posta adresini gir, sıfırlama linki gönderelim.</p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="E-posta"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 bg-muted/50 border-border rounded-xl"
                    required
                  />
                </div>
                <Button type="submit" disabled={loading} className="w-full bg-gradient-neon text-primary-foreground font-semibold rounded-xl py-5 neon-glow">
                  {loading ? "Gönderiliyor..." : "Link Gönder"}
                </Button>
              </form>
              <button onClick={() => setMode("login")} className="w-full text-center mt-4 text-sm text-muted-foreground hover:text-foreground">
                ← Giriş yap
              </button>
            </>
          )
        ) : (
          <>
            {/* Tabs */}
            <div className="flex bg-muted/50 rounded-xl p-1 mb-5">
              <button
                onClick={() => setMode("login")}
                className={`flex-1 text-sm font-semibold py-2 rounded-lg transition-all ${mode === "login" ? "bg-gradient-neon text-primary-foreground neon-glow" : "text-muted-foreground"}`}
              >
                Giriş Yap
              </button>
              <button
                onClick={() => setMode("signup")}
                className={`flex-1 text-sm font-semibold py-2 rounded-lg transition-all ${mode === "signup" ? "bg-gradient-neon text-primary-foreground neon-glow" : "text-muted-foreground"}`}
              >
                Kayıt Ol
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              {mode === "signup" && (
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Ad Soyad"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="pl-10 bg-muted/50 border-border rounded-xl"
                    required
                  />
                </div>
              )}
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="E-posta"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 bg-muted/50 border-border rounded-xl"
                  required
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type={showPass ? "text" : "password"}
                  placeholder="Şifre"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 bg-muted/50 border-border rounded-xl"
                  required
                  minLength={6}
                />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {mode === "login" && (
                <button type="button" onClick={() => setMode("forgot")} className="text-xs text-primary font-medium ml-1">
                  Şifreni mi unuttun?
                </button>
              )}
              <Button type="submit" disabled={loading} className="w-full bg-gradient-neon text-primary-foreground font-semibold rounded-xl py-5 neon-glow mt-1">
                {loading ? "Yükleniyor..." : mode === "login" ? "Giriş Yap" : "Kayıt Ol"}
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default AuthPage;
