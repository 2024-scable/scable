import Breadcrumb from '../components/Breadcrumbs/Breadcrumb';
import DashboardDependencyTree from '../components/Charts/DashboardDependencyTree';


const DependencyPage = () => {
    return (
        <>
            <Breadcrumb pageName="DependencyTree" />

            <div className="flex flex-col gap-10">
                <DashboardDependencyTree />
            </div>
        </>
    );
};

export default DependencyPage;
