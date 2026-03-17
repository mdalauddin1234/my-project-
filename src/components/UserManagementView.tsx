import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Users, Search, Plus, MoreHorizontal, Edit2, Trash2, ArrowUpDown, X, Shield, User as UserIcon, Mail, Lock } from 'lucide-react';
import { User, UserRole } from '../types';

interface UserManagementViewProps {
  users: User[];
  onAddUser: (user: Omit<User, 'id'>) => void;
  onDeleteUser: (username: string) => void;
}

export const UserManagementView: React.FC<UserManagementViewProps> = ({ users, onAddUser, onDeleteUser }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // New user form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    username: '',
    password: '',
    role: UserRole.USER
  });

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddUser(formData);
    setShowCreateModal(false);
    setFormData({
      name: '',
      email: '',
      username: '',
      password: '',
      role: UserRole.USER
    });
  };

  return (
    <motion.div 
      key="user-management"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Standardized Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center border border-indigo-100 shadow-sm">
            <Users className="text-indigo-600 w-7 h-7" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-indigo-900 tracking-tight">User Management</h2>
            <p className="text-zinc-500 text-sm font-medium">Manage user accounts and permissions</p>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden border-indigo-50 shadow-xl shadow-indigo-50/20">
        {/* Toolbar */}
        <div className="p-4 bg-white border-b border-indigo-50 flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300" />
            <input 
              type="text" 
              placeholder="Search..." 
              className="w-full pl-12 pr-4 py-3 bg-zinc-50/50 border border-indigo-50 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-zinc-300"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2 shadow-lg shadow-indigo-100 active:scale-95"
          >
            <Plus className="w-4 h-4" /> Create User
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-zinc-50/50 border-b border-indigo-50">
                <th className="table-header py-4 px-4 w-16"></th>
                <th className="table-header py-4 px-4">User</th>
                <th className="table-header py-4 px-4">Username</th>
                <th className="table-header py-4 px-4">Role</th>
                <th className="table-header py-4 px-4">
                  <div className="flex items-center gap-1">
                    Last Login <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-indigo-50/50">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-24 text-center text-zinc-300 font-medium italic">
                    No users found
                  </td>
                </tr>
              ) : (
                filteredUsers.map(user => (
                  <tr key={user.id} className="hover:bg-indigo-50/20 transition-colors group">
                    <td className="table-cell py-4 px-4 align-middle relative">
                      <button 
                        onClick={() => setActiveMenu(activeMenu === user.id ? null : user.id)}
                        className="p-2 text-zinc-400 hover:text-indigo-600 transition-colors"
                      >
                        <MoreHorizontal className="w-5 h-5" />
                      </button>
                      
                      <AnimatePresence>
                        {activeMenu === user.id && (
                          <>
                            <div 
                              className="fixed inset-0 z-10" 
                              onClick={() => setActiveMenu(null)}
                            />
                            <motion.div 
                              initial={{ opacity: 0, scale: 0.95, x: 10 }}
                              animate={{ opacity: 1, scale: 1, x: 0 }}
                              exit={{ opacity: 0, scale: 0.95, x: 10 }}
                              className="absolute left-12 top-4 w-36 bg-white rounded-xl shadow-2xl border border-indigo-50 z-20 overflow-hidden"
                            >
                              <button className="w-full px-4 py-3 text-left text-sm font-medium text-zinc-600 hover:bg-indigo-50 hover:text-indigo-600 flex items-center gap-3 transition-colors">
                                <Edit2 className="w-4 h-4" /> Edit
                              </button>
                              <button 
                                onClick={() => {
                                  onDeleteUser(user.username);
                                  setActiveMenu(null);
                                }}
                                className="w-full px-4 py-3 text-left text-sm font-medium text-rose-600 hover:bg-rose-50 flex items-center gap-3 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" /> Delete
                              </button>
                            </motion.div>
                          </>
                        )}
                      </AnimatePresence>
                    </td>
                    <td className="table-cell py-4 px-4 align-middle">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center border border-indigo-100 text-indigo-600 font-bold text-sm">
                          {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-indigo-900 leading-tight">{user.name}</p>
                          <p className="text-xs text-zinc-400">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="table-cell py-4 px-4 align-middle text-zinc-600 font-medium">{user.username}</td>
                    <td className="table-cell py-4 px-4 align-middle">
                      <span className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                        user.role === UserRole.ADMIN 
                          ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' 
                          : 'bg-zinc-50 text-zinc-500 border border-zinc-100'
                      }`}>
                        {user.role.toLowerCase()}
                      </span>
                    </td>
                    <td className="table-cell py-4 px-4 align-middle text-zinc-500 text-sm">
                      {user.lastLogin || 'Never'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create User Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-indigo-900/40 backdrop-blur-sm"
              onClick={() => setShowCreateModal(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-indigo-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white">
                    <Plus className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-indigo-900">Create New User</h3>
                </div>
                <button 
                  onClick={() => setShowCreateModal(false)}
                  className="p-2 text-zinc-400 hover:text-indigo-600 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Full Name</label>
                  <div className="relative">
                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <input 
                      required
                      type="text"
                      className="w-full pl-12 pr-4 py-3 bg-zinc-50 border border-indigo-50 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      placeholder="John Doe"
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <input 
                      required
                      type="email"
                      className="w-full pl-12 pr-4 py-3 bg-zinc-50 border border-indigo-50 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      placeholder="john@example.com"
                      value={formData.email}
                      onChange={e => setFormData({...formData, email: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Username</label>
                    <input 
                      required
                      type="text"
                      className="w-full px-4 py-3 bg-zinc-50 border border-indigo-50 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      placeholder="johndoe"
                      value={formData.username}
                      onChange={e => setFormData({...formData, username: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                      <input 
                        required
                        type="password"
                        className="w-full pl-12 pr-4 py-3 bg-zinc-50 border border-indigo-50 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        placeholder="••••••••"
                        value={formData.password}
                        onChange={e => setFormData({...formData, password: e.target.value})}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-500 uppercase ml-1">User Role</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      type="button"
                      onClick={() => setFormData({...formData, role: UserRole.USER})}
                      className={`py-3 rounded-xl text-sm font-bold border transition-all flex items-center justify-center gap-2 ${
                        formData.role === UserRole.USER 
                          ? 'bg-indigo-50 border-indigo-600 text-indigo-600' 
                          : 'bg-white border-indigo-50 text-zinc-400'
                      }`}
                    >
                      <UserIcon className="w-4 h-4" /> User
                    </button>
                    <button 
                      type="button"
                      onClick={() => setFormData({...formData, role: UserRole.ADMIN})}
                      className={`py-3 rounded-xl text-sm font-bold border transition-all flex items-center justify-center gap-2 ${
                        formData.role === UserRole.ADMIN 
                          ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100' 
                          : 'bg-white border-indigo-50 text-zinc-400'
                      }`}
                    >
                      <Shield className="w-4 h-4" /> Admin
                    </button>
                  </div>
                </div>

                <button 
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl shadow-xl shadow-indigo-100 transition-all active:scale-[0.98] mt-4"
                >
                  Create User Account
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
