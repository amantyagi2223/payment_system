"use client";

import { useAuthStore } from "@/store/authStore";
import { ShippingAddress } from "@/lib/api-client";
import Protected from "@/components/Protected";
import AddressForm from "@/components/AddressForm";
import Link from "next/link";
import { useState, useEffect } from "react";


export default function ProfilePage() {
  const { 
    user, 
    logout, 
    shippingAddresses, 
    loadShippingAddresses,
    addShippingAddress,
    updateShippingAddress,
    removeShippingAddress,
    setPrimaryAddress 
  } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadShippingAddresses();
    }
  }, [user, loadShippingAddresses]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingAddress, setEditingAddress] = useState<ShippingAddress | null>(null);
  const [showAddressModal, setShowAddressModal] = useState(false);


  const handleLogout = () => {
    logout();
  };

  const addAddress = async (formData: Pick<ShippingAddress, 'name' | 'address1' | 'address2' | 'city' | 'state' | 'zipCode' | 'country'>) => {
    try {
      await addShippingAddress(formData);
      setShowAddressModal(false);
      setEditingAddress(null);
    } catch (error) {
      console.error('Add address failed:', error);
      alert('Failed to add address');
    }
  };

  const updateAddress = async (formData: Partial<Pick<ShippingAddress, 'name' | 'address1' | 'address2' | 'city' | 'state' | 'zipCode' | 'country'>>) => {
    if (editingAddress) {
      try {
        await updateShippingAddress(editingAddress.id, formData);
        setEditingAddress(null);
        setShowAddressModal(false);
      } catch (error) {
        console.error('Update address failed:', error);
        alert('Failed to update address');
      }
    }
  };


  const removeAddress = async (id: string) => {
    if (confirm('Delete this address?')) {
      try {
        await removeShippingAddress(id);
      } catch (error) {
        console.error('Delete address failed:', error);
        alert('Failed to delete address');
      }
    }
  };

  const handleSetPrimaryAddress = async (id: string) => {
    try {
      await setPrimaryAddress(id);
    } catch (error) {
      console.error('Set primary failed:', error);
      alert('Failed to set primary address');
    }
  };



  return (
    <Protected>
      <div className="min-h-screen bg-slate-950 text-white">
        {/* Animated Background */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-cyan-500/5 via-transparent to-purple-500/5 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-purple-500/5 via-transparent to-cyan-500/5 rounded-full blur-3xl"></div>
        </div>

        <div className="relative max-w-2xl mx-auto px-6 py-10">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center text-4xl font-bold text-white shadow-lg shadow-cyan-500/30">
              {user?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
            </div>
            <h1 className="text-3xl font-bold mb-1">
              {user?.name || 'User'}
            </h1>
            <p className="text-slate-400">{user?.email}</p>
          </div>

          {/* Profile Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            {/* Account Section */}
            <div className="p-6 border-b border-slate-800">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Account Information
              </h2>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center py-3 px-4 bg-slate-800/50 rounded-xl">
                  <div>
                    <p className="text-sm text-slate-400">Full Name</p>
                    <p className="font-medium">{user?.name || 'Not set'}</p>
                  </div>
                  <button 
                    onClick={() => setIsEditing(!isEditing)}
                    className="text-cyan-400 hover:text-cyan-300 text-sm"
                  >
                    Edit
                  </button>
                </div>

                <div className="flex justify-between items-center py-3 px-4 bg-slate-800/50 rounded-xl">
                  <div>
                    <p className="text-sm text-slate-400">Email Address</p>
                    <p className="font-medium">{user?.email}</p>
                  </div>
                </div>

                <div className="flex justify-between items-center py-3 px-4 bg-slate-800/50 rounded-xl">
                  <div>
                    <p className="text-sm text-slate-400">Account ID</p>
                    <p className="font-medium text-sm">{user?.id || 'N/A'}</p>
                  </div>
                </div>
              </div>
            </div>


            {/* Quick Links */}
            <div className="p-6 border-b border-slate-800">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Quick Actions
              </h2>
              
              <div className="grid grid-cols-2 gap-3">
                <Link
                  href="/orders"
                  className="flex items-center gap-3 p-4 bg-slate-800/50 rounded-xl hover:bg-slate-800 transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium">My Orders</p>
                    <p className="text-xs text-slate-400">View all orders</p>
                  </div>
                </Link>

                <Link
                  href="/cart"
                  className="flex items-center gap-3 p-4 bg-slate-800/50 rounded-xl hover:bg-slate-800 transition-colors"
                >
                  <div className="relative w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium">Shopping Cart</p>
                    <p className="text-xs text-slate-400">Review items</p>
                  </div>
                </Link>

                <Link
                  href="/products"
                  className="flex items-center gap-3 p-4 bg-slate-800/50 rounded-xl hover:bg-slate-800 transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium">Shop Now</p>
                    <p className="text-xs text-slate-400">Browse products</p>
                  </div>
                </Link>

                <Link
                  href="/how-it-works"
                  className="flex items-center gap-3 p-4 bg-slate-800/50 rounded-xl hover:bg-slate-800 transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium">Help</p>
                    <p className="text-xs text-slate-400">How it works</p>
                  </div>
                </Link>

                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 p-4 bg-red-500/10 rounded-xl hover:bg-red-500/20 transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-red-400">Logout</p>
                    <p className="text-xs text-slate-400">Sign out</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Shipping Addresses Section */}
            <div className="p-6">
              <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Shipping Addresses
              </h2>

              {/* Addresses List */}
              <div className="space-y-3 mb-6">
                {(shippingAddresses ?? []).map((addr) => (
                  <div key={addr.id} className="flex gap-4 p-4 bg-slate-800/50 rounded-xl border border-slate-700 hover:border-slate-600 transition-all">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                      {addr.isPrimary && (
                        <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs font-semibold rounded-full">
                          Primary
                        </span>
                      )}
                    </div>

                    <div className="flex-1">
                      <h4 className="font-semibold">{addr.name}</h4>
                      <p className="text-sm text-slate-300">{addr.address1}</p>
                      {addr.address2 && <p className="text-sm text-slate-300">{addr.address2}</p>}
                      <p className="text-sm text-slate-400">{addr.city}, {addr.state} {addr.zipCode}</p>
                      <p className="text-sm text-slate-400">{addr.country}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditingAddress(addr)}
                        className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition-colors"
                      >
                        Edit
                      </button>
                      {!addr.isPrimary && (
                        <button
                          onClick={() => handleSetPrimaryAddress(addr.id)}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition-colors"
                        >
                          Set Primary
                        </button>
                      )}
                      <button
                        onClick={() => removeAddress(addr.id)}
                        className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-sm rounded-lg transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>


              {/* Add New Address Button */}
              <button
                onClick={() => {
                  setEditingAddress(null);
                  setShowAddressModal(true);
                }}
                className="w-full py-3 border-2 border-dashed border-slate-700 hover:border-slate-600 text-slate-400 hover:text-white rounded-xl transition-all font-medium flex items-center gap-2 justify-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add New Address
              </button>

              {/* Address Modal Overlay */}
              {showAddressModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                    <AddressForm
                      address={editingAddress}
                      onSave={(data) => {
                        if (editingAddress) {
                          const updates = { 
                            name: data.name, 
                            address1: data.address1, 
                            address2: data.address2 || null, 
                            city: data.city, 
                            state: data.state, 
                            zipCode: data.zipCode, 
                            country: data.country 
                          };
                          updateAddress(updates);
                        } else {
                          addAddress(data);
                        }
                        setShowAddressModal(false);
                        setEditingAddress(null);
                      }}
                      onCancel={() => {
                        setShowAddressModal(false);
                        setEditingAddress(null);
                      }}
                      isOpen={true}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Security Note */}
            <div className="p-6 bg-slate-800/30">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center flex-shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-green-400">Secure Account</p>
                  <p className="text-sm text-slate-400 mt-1">
                    Your account is protected with industry-standard security. All crypto transactions are verified on the blockchain.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Protected>
  );
}

