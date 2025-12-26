import { useState, useEffect } from 'react';
import { Users, Search, Plus, MoreVertical } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { collection, onSnapshot, doc, updateDoc, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebaseConfig';

// Mock data for development - replace with real Stripe data later
export interface Payment {
    id: string;
    customerId: string;
    customerName: string;
    amount: number;
    currency: string;
    status: 'pending' | 'paid' | 'failed' | 'refunded';
    createdAt: Date;
    invoiceId?: string;
    subscriptionId?: string;
}

export default function PaymentsPage() {
    const navigate = useNavigate();
    const [payments, setPayments] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'paid' | 'failed' | 'refunded'>('all');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newPayment, setNewPayment] = useState({
        customerId: '',
        customerName: '',
        amount: 0,
        currency: 'USD'
    });

    useEffect(() => {
        // In a real implementation, this would connect to Stripe API
        // For now, we'll use Firestore as a mock
        const paymentsRef = collection(db, 'payments');
        const unsubscribe = onSnapshot(paymentsRef, (snapshot) => {
            const paymentsData = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    createdAt: data.createdAt?.toDate() || new Date()
                } as Payment;
            });
            setPayments(paymentsData);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const filteredPayments = payments.filter(payment => {
        const matchesSearch = payment.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             payment.customerId.includes(searchTerm);
        const matchesStatus = filterStatus === 'all' || payment.status === filterStatus;
        return matchesSearch && matchesStatus;
    });

    const handleCreatePayment = async () => {
        try {
            setLoading(true);
            await addDoc(collection(db, 'payments'), {
                ...newPayment,
                status: 'pending',
                createdAt: Timestamp.now()
            });
            setShowCreateModal(false);
            setNewPayment({ customerId: '', customerName: '', amount: 0, currency: 'USD' });
        } catch (error) {
            console.error('Error creating payment:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = async (paymentId: string, newStatus: Payment['status']) => {
        try {
            await updateDoc(doc(db, 'payments', paymentId), {
                status: newStatus
            });
        } catch (error) {
            console.error('Error updating payment status:', error);
        }
    };

    const getStatusBadge = (status: Payment['status']) => {
        const colors = {
            pending: 'bg-yellow-100 text-yellow-800',
            paid: 'bg-green-100 text-green-800',
            failed: 'bg-red-100 text-red-800',
            refunded: 'bg-blue-100 text-blue-800'
        };
        return (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[status]}`}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
        );
    };

    return (
        <div className="p-8">
            <header className="mb-8">
                <h1 className="text-2xl font-bold text-primary">Payments Dashboard</h1>
                <p className="text-textSecondary mt-1">Manage customer payments and subscriptions</p>
            </header>

            <div className="bg-surface rounded-lg border border-border shadow-subtle overflow-hidden">
                <div className="px-6 py-4 border-b border-border flex flex-col md:flex-row justify-between items-center bg-surfaceHighlight gap-4">
                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <div className="relative flex-1 md:flex-none">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-textSecondary" />
                            <input
                                type="text"
                                placeholder="Search customers..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 pr-4 py-2 bg-surface border border-border rounded-lg w-full md:w-64 focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                        </div>
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value as Payment['status'] | 'all')}
                            className="px-3 py-2 bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                            <option value="all">All Statuses</option>
                            <option value="pending">Pending</option>
                            <option value="paid">Paid</option>
                            <option value="failed">Failed</option>
                            <option value="refunded">Refunded</option>
                        </select>
                    </div>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primaryLight transition-colors w-full md:w-auto"
                    >
                        <Plus className="w-5 h-5" />
                        Create Payment
                    </button>
                </div>

                {loading ? (
                    <div className="p-8 text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                        <p className="mt-4 text-textSecondary">Loading payments...</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-surface border-b border-border">
                                <tr>
                                    <th className="px-6 py-3 font-medium text-textSecondary uppercase tracking-wider">Customer</th>
                                    <th className="px-6 py-3 font-medium text-textSecondary uppercase tracking-wider">Amount</th>
                                    <th className="px-6 py-3 font-medium text-textSecondary uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 font-medium text-textSecondary uppercase tracking-wider">Date</th>
                                    <th className="px-6 py-3 font-medium text-textSecondary uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {filteredPayments.length > 0 ? (
                                    filteredPayments.map((payment) => (
                                        <tr key={payment.id} className="hover:bg-surfaceHighlight transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-primaryLight flex items-center justify-center">
                                                        <Users className="w-5 h-5 text-primary" />
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-primary">{payment.customerName}</div>
                                                        <div className="text-xs text-textSecondary">ID: {payment.customerId}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-primary">
                                                    {payment.currency} {payment.amount.toFixed(2)}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {getStatusBadge(payment.status)}
                                            </td>
                                            <td className="px-6 py-4 text-textSecondary">
                                                {payment.createdAt.toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    {payment.status === 'pending' && (
                                                        <button
                                                            onClick={() => handleUpdateStatus(payment.id, 'paid')}
                                                            className="px-3 py-1 bg-green-100 text-green-800 rounded text-xs font-medium"
                                                        >
                                                            Mark Paid
                                                        </button>
                                                    )}
                                                    {payment.status === 'paid' && (
                                                        <button
                                                            onClick={() => handleUpdateStatus(payment.id, 'refunded')}
                                                            className="px-3 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium"
                                                        >
                                                            Refund
                                                        </button>
                                                    )}
                                                    {payment.status === 'paid' && (
                                                        <button
                                                            onClick={() => {
                                                                // Navigate to marketplace config with seed data
                                                                const searchParams = new URLSearchParams();
                                                                searchParams.set('seed_title', `Promotion: ${payment.customerName} Special`);
                                                                searchParams.set('seed_price', `${payment.currency} ${payment.amount}`);
                                                                searchParams.set('seed_category', 'Sale');
                                                                navigate(`/marketplace?${searchParams.toString()}`);
                                                            }}
                                                            className="px-3 py-1 bg-amber-100 text-amber-800 rounded text-xs font-medium hover:bg-amber-200"
                                                            title="Promote this sale type to Marketplace"
                                                        >
                                                            Promote
                                                        </button>
                                                    )}
                                                    <button className="p-1 text-textSecondary hover:text-primary">
                                                        <MoreVertical className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-8 text-center text-textSecondary">
                                            No payments found. Create your first payment to get started.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Create Payment Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-surface rounded-lg border border-border shadow-xl w-full max-w-md">
                        <div className="px-6 py-4 border-b border-border flex justify-between items-center">
                            <h3 className="font-semibold text-primary">Create New Payment</h3>
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="text-textSecondary hover:text-primary"
                            >
                                <span className="text-xl">&times;</span>
                            </button>
                        </div>
                        <div className="p-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-textSecondary mb-1">Customer ID</label>
                                    <input
                                        type="text"
                                        value={newPayment.customerId}
                                        onChange={(e) => setNewPayment({...newPayment, customerId: e.target.value})}
                                        className="w-full px-3 py-2 bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                                        placeholder="CUST12345"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-textSecondary mb-1">Customer Name</label>
                                    <input
                                        type="text"
                                        value={newPayment.customerName}
                                        onChange={(e) => setNewPayment({...newPayment, customerName: e.target.value})}
                                        className="w-full px-3 py-2 bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                                        placeholder="John Doe"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-textSecondary mb-1">Amount</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-textSecondary">$</span>
                                        <input
                                            type="number"
                                            value={newPayment.amount}
                                            onChange={(e) => setNewPayment({...newPayment, amount: parseFloat(e.target.value) || 0})}
                                            className="w-full pl-8 pr-3 py-2 bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                                            placeholder="0.00"
                                            step="0.01"
                                            min="0"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-textSecondary mb-1">Currency</label>
                                    <select
                                        value={newPayment.currency}
                                        onChange={(e) => setNewPayment({...newPayment, currency: e.target.value})}
                                        className="w-full px-3 py-2 bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                                    >
                                        <option value="USD">USD ($)</option>
                                        <option value="EUR">EUR (€)</option>
                                        <option value="GBP">GBP (£)</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t border-border flex justify-end gap-3">
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="px-4 py-2 text-textSecondary hover:text-primary transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreatePayment}
                                disabled={!newPayment.customerId || !newPayment.customerName || newPayment.amount <= 0}
                                className={`px-4 py-2 bg-primary text-white rounded-lg hover:bg-primaryLight transition-colors ${(!newPayment.customerId || !newPayment.customerName || newPayment.amount <= 0) ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                Create Payment
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
