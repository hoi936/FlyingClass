import React, { useState } from 'react';
import { XMarkIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { studentService } from '../services/api';

interface AIPricingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AIPricingModal: React.FC<AIPricingModalProps> = ({ isOpen, onClose }) => {
  const [step, setStep] = useState<'pricing' | 'payment' | 'success'>('pricing');
  const [loading, setLoading] = useState(false);
  const [paymentInfo, setPaymentInfo] = useState<{ amount: number; order_code: string } | null>(null);

  if (!isOpen) return null;

  const handleSelectPackage = async (packageType: 'Monthly' | 'Yearly') => {
    try {
      setLoading(true);
      const res = await studentService.createSubscriptionOrder(packageType);
      if (res.success) {
        setPaymentInfo({
          amount: res.amount,
          order_code: res.order_code
        });
        setStep('payment');
      } else {
        alert(res.message);
      }
    } catch (err) {
      console.error(err);
      alert('Có lỗi xảy ra khi tạo đơn hàng.');
    } finally {
      setLoading(false);
    }
  };

  const renderPricing = () => (
    <div className="p-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Nâng cấp Gói AI Thông Minh</h2>
        <p className="text-slate-600 dark:text-slate-400 mt-2">Mở khóa toàn bộ sức mạnh của AI trong việc tạo đề thi và hỗ trợ giảng dạy.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Gói Tháng */}
        <div className="border-2 border-slate-200 dark:border-slate-700 rounded-2xl p-6 bg-white dark:bg-slate-800 hover:border-blue-500 transition relative">
          <h3 className="text-xl font-bold text-slate-800 dark:text-white">Gói Tháng</h3>
          <div className="mt-4 mb-6">
            <span className="text-4xl font-extrabold text-slate-900 dark:text-white">199k</span>
            <span className="text-slate-500 dark:text-slate-400">/tháng</span>
          </div>
          <ul className="space-y-3 mb-8">
            <li className="flex items-center text-slate-600 dark:text-slate-300">
              <CheckCircleIcon className="w-5 h-5 text-emerald-500 mr-2" /> Tạo đề thi AI không giới hạn
            </li>
            <li className="flex items-center text-slate-600 dark:text-slate-300">
              <CheckCircleIcon className="w-5 h-5 text-emerald-500 mr-2" /> Chấm điểm tự động bằng AI
            </li>
            <li className="flex items-center text-slate-600 dark:text-slate-300">
              <CheckCircleIcon className="w-5 h-5 text-emerald-500 mr-2" /> Phân tích học lực tự động
            </li>
          </ul>
          <button 
            onClick={() => handleSelectPackage('Monthly')}
            disabled={loading}
            className="w-full py-3 px-4 bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 font-bold rounded-xl hover:bg-blue-100 dark:hover:bg-blue-500/20 transition"
          >
            {loading ? 'Đang xử lý...' : 'Chọn gói này'}
          </button>
        </div>

        {/* Gói Năm */}
        <div className="border-2 border-blue-500 rounded-2xl p-6 bg-blue-50/50 dark:bg-blue-900/20 relative shadow-xl shadow-blue-500/10">
          <div className="absolute top-0 right-6 transform -translate-y-1/2">
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">Tiết kiệm 50%</span>
          </div>
          <h3 className="text-xl font-bold text-slate-800 dark:text-white">Gói Năm</h3>
          <div className="mt-4 mb-6">
            <span className="text-4xl font-extrabold text-blue-600 dark:text-blue-400">1.099k</span>
            <span className="text-slate-500 dark:text-slate-400">/năm</span>
          </div>
          <ul className="space-y-3 mb-8">
            <li className="flex items-center text-slate-600 dark:text-slate-300">
              <CheckCircleIcon className="w-5 h-5 text-emerald-500 mr-2" /> Tất cả tính năng của gói Tháng
            </li>
            <li className="flex items-center text-slate-600 dark:text-slate-300">
              <CheckCircleIcon className="w-5 h-5 text-emerald-500 mr-2" /> Hỗ trợ ưu tiên 24/7
            </li>
            <li className="flex items-center text-slate-600 dark:text-slate-300">
              <CheckCircleIcon className="w-5 h-5 text-emerald-500 mr-2" /> Trải nghiệm tính năng AI mới sớm nhất
            </li>
          </ul>
          <button 
            onClick={() => handleSelectPackage('Yearly')}
            disabled={loading}
            className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl hover:shadow-lg hover:shadow-blue-500/30 transition transform hover:-translate-y-0.5"
          >
            {loading ? 'Đang xử lý...' : 'Đăng ký ngay'}
          </button>
        </div>
      </div>
    </div>
  );

  const renderPayment = () => {
    if (!paymentInfo) return null;
    
    // VietQR Format
    // img.vietqr.io/image/<BANK_BIN>-<ACCOUNT_NO>-<TEMPLATE>.png?amount=<AMOUNT>&addInfo=<DESCRIPTION>&accountName=<ACCOUNT_NAME>
    const bankBin = '970422'; // MB Bank
    const accountNo = '0762711083';
    const accountName = 'FlyingClass';
    const qrUrl = `https://img.vietqr.io/image/${bankBin}-${accountNo}-compact2.png?amount=${paymentInfo.amount}&addInfo=${paymentInfo.order_code}&accountName=${encodeURIComponent(accountName)}`;

    return (
      <div className="p-6 text-center">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-4">Thanh Toán Quét Mã QR</h2>
        <p className="text-slate-600 dark:text-slate-400 mb-6">Mở ứng dụng ngân hàng hoặc MoMo của bạn để quét mã bên dưới.</p>
        
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm inline-block mb-6">
          <img src={qrUrl} alt="VietQR Payment" className="w-64 h-64 mx-auto" />
        </div>
        
        <div className="bg-blue-50 dark:bg-slate-800 rounded-xl p-4 mb-6 text-left max-w-sm mx-auto">
          <div className="flex justify-between mb-2">
            <span className="text-slate-500 dark:text-slate-400">Số tiền:</span>
            <span className="font-bold text-blue-600 dark:text-blue-400">{paymentInfo.amount.toLocaleString()} VNĐ</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 dark:text-slate-400">Nội dung:</span>
            <span className="font-bold text-slate-800 dark:text-white">{paymentInfo.order_code}</span>
          </div>
        </div>

        <button 
          onClick={() => setStep('success')}
          className="w-full max-w-sm py-3 px-4 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 transition shadow-lg shadow-emerald-500/30"
        >
          Tôi Đã Chuyển Khoản Thành Công
        </button>
      </div>
    );
  };

  const renderSuccess = () => (
    <div className="p-8 text-center">
      <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/50 rounded-full flex items-center justify-center mx-auto mb-6">
        <CheckCircleIcon className="w-10 h-10 text-emerald-500" />
      </div>
      <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-4">Đã Gửi Yêu Cầu!</h2>
      <p className="text-slate-600 dark:text-slate-400 mb-8">
        Hệ thống đã ghi nhận thanh toán của bạn. Quản trị viên sẽ kiểm tra và cộng ngày sử dụng cho tài khoản của bạn trong thời gian sớm nhất (thường từ 5-10 phút).
      </p>
      <button 
        onClick={onClose}
        className="py-3 px-8 bg-slate-800 dark:bg-slate-700 text-white font-bold rounded-xl hover:bg-slate-700 transition"
      >
        Trở về trang chủ
      </button>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition"
        >
          <XMarkIcon className="w-6 h-6" />
        </button>
        
        {step === 'pricing' && renderPricing()}
        {step === 'payment' && renderPayment()}
        {step === 'success' && renderSuccess()}
      </div>
    </div>
  );
};

export default AIPricingModal;
