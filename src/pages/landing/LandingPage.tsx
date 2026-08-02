import { Button } from "../../components/ui/button";
import { Link } from "react-router-dom";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-6">
      <div className="relative mx-auto max-w-4xl text-center">
        <span className="text-sm font-bold uppercase tracking-wider text-indigo-600">
          ZAYD INDUSTRIES
        </span>

        <h1 className="mt-6 text-5xl font-extrabold tracking-tight text-slate-900 sm:text-6xl md:text-7xl">
          Business Operating
          <br className="hidden sm:block" />
          System for Modern
          <br className="hidden sm:block" />
          Enterprises
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-600 sm:text-xl">
          Manage finance, employees, customers, quotations, invoices,
          projects and analytics across Zayd Industries and all subsidiary
          companies from one secure platform.
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-6">
          <Link to="/login" className="w-full sm:w-auto">
            <Button size="lg" className="h-12 w-full px-8">
              Get Started
            </Button>
          </Link>

          <Button size="lg" variant="outline" className="h-12 w-full px-8 sm:w-auto">
            Learn More
          </Button>
        </div>
      </div>
    </div>
  );
}