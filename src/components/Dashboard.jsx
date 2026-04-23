import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

export const Dashboard = ({ currentUser }) => {
  const [stats, setStats] = useState({ activeProjects: 0, openTasks: 0, pendingInvoices: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        // 1. Fetch Active Projects
        const { data: allProjects } = await supabase
          .from('projects')
          .select('id, assignee, client, status');
        
        // Filter based on role
        let relevantProjects = allProjects || [];
        if (currentUser.role === 'worker') {
          relevantProjects = allProjects.filter(p => p.assignee === currentUser.name);
        } else if (currentUser.role === 'client') {
          relevantProjects = allProjects.filter(p => p.client === currentUser.name);
        }
        
        const activeProjects = relevantProjects.filter(p => p.status !== 'Done' && p.status !== 'Completed');
        
        // 2. Fetch Open Tasks for relevant projects
        let openTasksCount = 0;
        const projectIds = activeProjects.map(p => p.id);
        
        if (projectIds.length > 0) {
          try {
            const { data: tasksSnap, error } = await supabase
              .from('tasks')
              .select('status')
              .in('projectId', projectIds);
              
            if (!error && tasksSnap) {
              const openTasks = tasksSnap.filter(t => t.status !== 'Done' && t.status !== 'Completed');
              openTasksCount = openTasks.length;
            }
          } catch (e) {
            console.error("Error fetching tasks:", e);
          }
        }

        setStats({
          activeProjects: activeProjects.length,
          openTasks: openTasksCount,
          pendingInvoices: 0 // Mocked for now until Finance is connected
        });
      } catch (err) {
        console.error("Error fetching dashboard stats:", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchStats();
  }, [currentUser]);

  return (
    <div className="flex-col gap-6 w-full">
      <div className="flex gap-6 w-full flex-wrap">
        <div className="card flex-1 hover-elevate animate-slide-up delay-100" style={{ minWidth: 'min(100%, 300px)' }}>
          <div className="card-body flex justify-between items-center">
            <span className="text-secondary font-medium">Active Projects</span>
            {loading ? <Loader2 size={24} className="animate-spin text-secondary" /> : <span className="text-3xl font-bold">{stats.activeProjects}</span>}
          </div>
        </div>
        <div className="card flex-1 hover-elevate animate-slide-up delay-200" style={{ minWidth: 'min(100%, 300px)' }}>
          <div className="card-body flex justify-between items-center">
            <span className="text-secondary font-medium">Open Tasks</span>
            {loading ? <Loader2 size={24} className="animate-spin text-secondary" /> : <span className="text-3xl font-bold">{stats.openTasks}</span>}
          </div>
        </div>
        {currentUser.role !== 'worker' && (
          <div className="card flex-1 hover-elevate animate-slide-up delay-300" style={{ minWidth: 'min(100%, 300px)' }}>
            <div className="card-body flex justify-between items-center">
              <span className="text-secondary font-medium">Pending Invoices</span>
              {loading ? <Loader2 size={24} className="animate-spin text-secondary" /> : <span className="text-3xl font-bold">{stats.pendingInvoices}</span>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
