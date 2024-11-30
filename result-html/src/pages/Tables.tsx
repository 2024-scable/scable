import Breadcrumb from '../components/Breadcrumbs/Breadcrumb';
import TablePackage from '../components/Tables/TablePackage'; 
import ChartLibrary from '../components/Charts/ChartLibrary'; 

const Tables = () => {
    return (
        <>
            <Breadcrumb pageName="Components" />

            <div className="flex flex-col gap-10">
                <ChartLibrary />
            </div>
            <div className="flex flex-col gap-10">
                <TablePackage />
            </div>
        </>
    );
};

export default Tables;
