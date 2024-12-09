import { useEffect, useState } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';

import Loader from './common/Loader';
import PageTitle from './components/PageTitle';
import Dashboard from './pages/Dashboard/Dashboard';
import Tables from './pages/Tables';
import PackageDetail from './pages/PackageDetail';
import LicenseDetail from './pages/LicenseDetail';
import LicensePage from './pages/LicensePage';
import DependencyPage from './pages/DependencyPage';
import VulnPage from './pages/VulnPage';
import DefaultLayout from './layout/DefaultLayout';
import Mainpage from './pages/Mainpage';

function App() {
    const [loading, setLoading] = useState<boolean>(true);
    const { pathname } = useLocation();

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [pathname]);

    useEffect(() => {
        setTimeout(() => setLoading(false), 1000);
    }, []);

    return loading ? (
        <Loader />
    ) : (
        <DefaultLayout>
            <Routes>
                <Route
                    index
                    element={
                        <>
                            <PageTitle title="Mainpage Dashboard | Scable" />
                            <Mainpage />
                        </>
                    }
                />

                <Route path="/:projectName">

                    <Route
                        index
                        element={
                            <>
                                <PageTitle title="Mainpage Dashboard | Scable" />
                                <Dashboard />
                            </>
                        }
                    />
                    <Route
                        path="components"
                        element={
                            <>
                                <PageTitle title="Components | Scable" />
                                <Tables />
                            </>
                        }
                    />
                    <Route
                        path="components/:id"
                        element={
                            <>
                                <PageTitle title="Components Detail | Scable" />
                                <PackageDetail />
                            </>
                        }
                    />
                    <Route
                        path="license"
                        element={
                            <>
                                <PageTitle title="License | Scable" />
                                <LicensePage />
                            </>
                        }
                    />
                    <Route
                        path="license/:licensename"
                        element={
                            <>
                                <PageTitle title="License Detail | Scable" />
                                <LicenseDetail />
                            </>
                        }
                    />
                    <Route
                        path="vuln"
                        element={
                            <>
                                <PageTitle title="Vulnerability | Scable" />
                                <VulnPage />
                            </>
                        }
                    />
                    <Route
                        path="dependencytree"
                        element={
                            <>
                                <PageTitle title="Dependency Tree | Scable" />
                                <DependencyPage />
                            </>
                        }
                    />
                </Route>
            </Routes>
        </DefaultLayout>
    );
}

export default App;
