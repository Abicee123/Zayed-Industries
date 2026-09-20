import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom"; // <-- Import Router Hooks
import { useAuthStore } from "../../store/authStore";
import { useDataStore } from "../../store/dataStore";

// Import our UI variants
import StandardProjects from "./variants/StandardProjects";
import AcademyCourses from "./variants/AcademyCourses";
// import ConstructionSites from "./variants/ConstructionSites";

export default function ProjectsPage() {
  const { role, activeWorkspace, companyId } = useAuthStore();
  const { companies } = useDataStore();
  
  const location = useLocation();
  const navigate = useNavigate();

  // State to hold the incoming project ID
  const [targetProjectId, setTargetProjectId] = useState<number | null>(null);

  // Catch the redirect signal from the Customers Page
  useEffect(() => {
    if (location.state?.openProjectId) {
      setTargetProjectId(location.state.openProjectId);
      
      // Clear the router state immediately so if the user hits refresh, 
      // it doesn't pop the modal open again.
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);

  // 1. Determine which company we are currently viewing
  const currentCompanyId = (role === 'admin' || role === 'head') && activeWorkspace ? activeWorkspace : companyId;
  const currentCompany = companies.find((c: any) => c.id == currentCompanyId);

  // 2. Extract the business type (fallback to 'normal' if undefined)
  const businessType = currentCompany?.business_type || 'normal';

  // 3. The Strategy Pattern Router
  // We now pass `autoOpenProjectId` down to the variants so they can open their own modals.
  switch (businessType) {
    case 'academy':
      return <AcademyCourses autoOpenProjectId={targetProjectId} />; 
      
    case 'construction':
      return <StandardProjects autoOpenProjectId={targetProjectId} />; // Placeholder
      
    case 'normal':
    default:
      return <StandardProjects autoOpenProjectId={targetProjectId} />;
  }
}