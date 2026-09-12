import { useAuthStore } from "../../store/authStore";
import { useDataStore } from "../../store/dataStore";

// Import our UI variants
import StandardProjects from "./variants/StandardProjects";
import AcademyCourses from "./variants/AcademyCourses";
// import ConstructionSites from "./variants/ConstructionSites";

export default function ProjectsPage() {
  const { role, activeWorkspace, companyId } = useAuthStore();
  const { companies } = useDataStore();

  // 1. Determine which company we are currently viewing
  const currentCompanyId = (role === 'admin' || role === 'head') && activeWorkspace ? activeWorkspace : companyId;
  const currentCompany = companies.find((c: any) => c.id == currentCompanyId);

  // 2. Extract the business type (fallback to 'normal' if undefined)
  const businessType = currentCompany?.business_type || 'normal';

  // 3. The Strategy Pattern Router
  switch (businessType) {
    case 'academy':
      return <AcademyCourses />; 
      
    case 'construction':
      return <StandardProjects />; // Placeholder until Construction UI is built
      
    case 'normal':
    default:
      return <StandardProjects />;
  }
}