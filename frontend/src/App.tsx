import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { KioskView } from './views/KioskView';
import { DashboardView } from './views/DashboardView';
import { EmployeesView } from './views/EmployeesView';
import { AttendanceView } from './views/AttendanceView';
import { LeavesView } from './views/LeavesView';
import { SettingsView } from './views/SettingsView';
import { api } from './api';

export function App() {
  const [currentTab, setCurrentTab] = useState<string>('kiosk');
  const [employeeCount, setEmployeeCount] = useState<number>(0);
  const [todayDateStr, setTodayDateStr] = useState<string>('');

  const refreshMeta = () => {
    api.getEmployees().then((res) => {
      setEmployeeCount(res.total);
    }).catch(console.error);

    api.getDashboardStats().then((res) => {
      if (res.summary?.today_date) {
        setTodayDateStr(res.summary.today_date);
      }
    }).catch(console.error);
  };

  useEffect(() => {
    refreshMeta();
  }, []);

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        activeCount={employeeCount}
      />

      {/* Main View Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Header
          onOpenKiosk={() => setCurrentTab('kiosk')}
          todayDate={todayDateStr}
        />

        <main className="flex-1 pb-16">
          {currentTab === 'kiosk' && (
            <KioskView onRefreshDashboard={refreshMeta} />
          )}

          {currentTab === 'dashboard' && (
            <DashboardView onOpenKiosk={() => setCurrentTab('kiosk')} />
          )}

          {currentTab === 'employees' && (
            <EmployeesView />
          )}

          {currentTab === 'attendance' && (
            <AttendanceView />
          )}

          {currentTab === 'leaves' && (
            <LeavesView />
          )}

          {currentTab === 'settings' && (
            <SettingsView />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
