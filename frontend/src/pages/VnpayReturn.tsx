import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, XCircle } from 'lucide-react';
import { studentService } from '../services/api';
import { useAuthStore } from '../store/useAuthStore';

const VnpayReturn = () => {
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<any>(null);
  const { checkAuth } = useAuthStore();

  useEffect(() => {
    const verifyPayment = async () => {
      try {
        const params = Object.fromEntries(new URLSearchParams(window.location.search).entries());
        const data = await studentService.verifyVnpayReturn(params);
        const message = data.message || data;
        setResult(message);
        if (message?.success) {
          await checkAuth();
        }
      } catch (err: any) {
        setResult({
          success: false,
          message: err?.response?.data?.message || 'Khong the xac thuc ket qua thanh toan.',
        });
      } finally {
        setLoading(false);
      }
    };

    verifyPayment();
  }, [checkAuth]);

  const success = Boolean(result?.success);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-8 text-center">
        {loading ? (
          <>
            <div className="mx-auto mb-5 h-12 w-12 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin" />
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Dang xac thuc thanh toan</h1>
          </>
        ) : (
          <>
            <div className={`mx-auto mb-5 h-16 w-16 rounded-full flex items-center justify-center ${success ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
              {success ? <CheckCircle size={34} /> : <XCircle size={34} />}
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              {success ? 'Thanh toan thanh cong' : 'Thanh toan chua thanh cong'}
            </h1>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
              {result?.message || 'Ket qua thanh toan da duoc ghi nhan.'}
            </p>
            {result?.vnp_transaction_no && (
              <p className="mt-3 text-xs text-slate-500">Ma GD VNPAY: {result.vnp_transaction_no}</p>
            )}
            <Link
              to="/"
              className="mt-6 inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-500 transition"
            >
              Ve trang chinh
            </Link>
          </>
        )}
      </div>
    </div>
  );
};

export default VnpayReturn;
