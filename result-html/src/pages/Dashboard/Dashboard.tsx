import React from "react";
import CardDataStats from "../../components/CardDataStats";
import ChartOne from "../../components/Charts/ChartOne";
import ChartThree from "../../components/Charts/ChartThree";
import ChartTwo from "../../components/Charts/ChartTwo";
import ChatCard from "../../components/Chat/ChatCard";
import TableOne from "../../components/Tables/TableOne";
import SummaryOne from "../../components/Tables/SummaryOne";
import DashboardVuln from "../../components/Charts/DashboardVuln"; 
import DashboardLicense from '../components/Charts/DashboardLicense';

const Mainpage: React.FC = () => {
    return (
        <>
            <div className="grid grid-cols-1 gap-6 md:gap-8 2xl:gap-10 space-y-2">
                <SummaryOne />
            </div>
        </>
    );
};

export default Mainpage;
