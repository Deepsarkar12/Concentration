import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSignup } from "@/hooks/use-auth";
import { Link } from "wouter";
import { PlaySquare, Loader2 } from "lucide-react";

const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type SignupForm = z.infer<typeof signupSchema>;

export default function Signup() {
  const signup = useSignup();
  const { register, handleSubmit, formState: { errors } } = useForm<SignupForm>({
    resolver: zodResolver(signupSchema)
  });

  const onSubmit = (data: SignupForm) => {
    signup.mutate(data);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4 relative overflow-hidden">
      <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-orange-600/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md glass-panel rounded-2xl p-8 relative z-10">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-orange-400 flex items-center justify-center shadow-lg shadow-primary/25 mb-4">
            <PlaySquare className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-3xl font-display font-bold text-foreground">Create Account</h1>
          <p className="text-muted-foreground mt-2">Start your learning journey today</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Full Name</label>
            <input 
              {...register("name")}
              className="w-full bg-secondary border-2 border-transparent focus:border-primary/50 focus:bg-background px-4 py-3 rounded-xl outline-none transition-all placeholder:text-muted-foreground/50"
              placeholder="John Doe"
            />
            {errors.name && <p className="text-destructive text-sm">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Email</label>
            <input 
              {...register("email")}
              className="w-full bg-secondary border-2 border-transparent focus:border-primary/50 focus:bg-background px-4 py-3 rounded-xl outline-none transition-all placeholder:text-muted-foreground/50"
              placeholder="you@example.com"
            />
            {errors.email && <p className="text-destructive text-sm">{errors.email.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Password</label>
            <input 
              {...register("password")}
              type="password"
              className="w-full bg-secondary border-2 border-transparent focus:border-primary/50 focus:bg-background px-4 py-3 rounded-xl outline-none transition-all placeholder:text-muted-foreground/50"
              placeholder="••••••••"
            />
            {errors.password && <p className="text-destructive text-sm">{errors.password.message}</p>}
          </div>

          <button 
            type="submit"
            disabled={signup.isPending}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-3 px-4 rounded-xl transition-all shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/40 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed mt-6"
          >
            {signup.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Sign Up"}
          </button>
        </form>

        <p className="text-center text-muted-foreground text-sm mt-8">
          Already have an account?{" "}
          <Link href="/login" className="text-primary hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
