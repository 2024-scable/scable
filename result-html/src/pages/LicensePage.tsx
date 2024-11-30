import Breadcrumb from '../components/Breadcrumbs/Breadcrumb';
import DashboardLicense from '../components/Charts/DashboardLicense';

const Tables = () => {
    return (
        <>
            <Breadcrumb pageName="Licenses" />

            <div className="flex flex-col gap-10">
                <DashboardLicense />
            </div>
        </>
    );
};

export default Tables;
