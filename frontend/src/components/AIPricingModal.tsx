import React, { useState, useEffect } from 'react';
import { XMarkIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { studentService } from '../services/api';

interface AIPricingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type PackageCategory = 'Normal' | 'Pro' | 'Custom';
type PackageType = 'Monthly' | 'Yearly' | 'Pro_Monthly' | 'Pro_Yearly' | 'Custom_Monthly';

interface AIPackage {
  id: PackageType;
  title: string;
  price: string;
  amount: number;
  suffix: string;
  limit: string;
  features: string[];
  featured?: boolean;
  badge?: string;
}

const packagesRecord: Record<PackageCategory, AIPackage[]> = {
  Normal: [
    {
      id: 'Monthly',
      title: 'Gói AI Thường (Tháng)',
      price: '199.000đ',
      amount: 199000,
      suffix: '/tháng',
      limit: '50.000 Tokens',
      features: [
        'Trò chuyện & Đặt câu hỏi với AI',
        'Tự động soạn thảo & Tạo đề thi nhanh',
        'Chấm điểm tự động qua mô hình AI',
        'Phân tích học lực & Tiến trình học tập',
        'Sử dụng mô hình AI tiêu chuẩn ổn định'
      ]
    },
    {
      id: 'Yearly',
      title: 'Gói AI Thường (Năm)',
      price: '1.099.000đ',
      amount: 1099000,
      suffix: '/năm',
      limit: '50.000 Tokens/tháng',
      featured: true,
      badge: 'Tiết kiệm 50%',
      features: [
        'Đầy đủ tính năng như Gói Tháng',
        'Hỗ trợ kỹ thuật ưu tiên 24/7',
        'Trải nghiệm tính năng AI mới nhất sớm nhất',
        'Ổn định hiệu năng trong giờ cao điểm',
        'Sử dụng mô hình AI tiêu chuẩn ổn định'
      ]
    }
  ],
  Pro: [
    {
      id: 'Pro_Monthly',
      title: 'Gói AI Pro (Tháng)',
      price: '398.000đ',
      amount: 398000,
      suffix: '/tháng',
      limit: '120.000 Tokens',
      features: [
        'Trò chuyện & Phân tích chuyên sâu với AI',
        'Soạn đề thi nâng cao, phân loại học sinh tốt hơn',
        'Chấm điểm thông minh, nhận xét siêu chi tiết',
        'Đọc & Phân tích tài liệu PDF/Excel dung lượng lớn',
        'Sử dụng mô hình AI cao cấp thế hệ mới'
      ]
    },
    {
      id: 'Pro_Yearly',
      title: 'Gói AI Pro (Năm)',
      price: '2.198.000đ',
      amount: 2198000,
      suffix: '/năm',
      limit: '120.000 Tokens/tháng',
      featured: true,
      badge: 'Tiết kiệm 50%',
      features: [
        'Đầy đủ tính năng như Gói Pro Tháng',
        'Hỗ trợ kỹ thuật ưu tiên 24/7 từ chuyên viên',
        'Trải nghiệm tính năng AI Pro mới nhất sớm nhất',
        'Hạn mức băng thông tối đa không lo bị nghẽn',
        'Sử dụng mô hình AI cao cấp thế hệ mới'
      ]
    }
  ],
  Custom: [
    {
      id: 'Custom_Monthly',
      title: 'Gói Token Tuỳ Chỉnh',
      price: '150.000đ',
      amount: 150000,
      suffix: '/ 50k Tokens',
      limit: '50.000 Tokens (Cộng dồn)',
      features: [
        'Linh hoạt mua theo nhu cầu thực tế',
        'Cộng dồn token vào tài khoản hiện tại',
        'Không giới hạn thời gian sử dụng token',
        'Áp dụng cho mọi tính năng AI của hệ thống',
        'Có thể mua nhiều lần tuỳ thích'
      ]
    }
  ]
};

const getErrorMessage = (value: any) => {
  if (!value) return 'Có lỗi xảy ra khi thanh toán.';
  if (typeof value === 'string') return value;
  if (typeof value.message === 'string') return value.message;
  if (typeof value.response?.data?.message === 'string') return value.response.data.message;
  return 'Có lỗi xảy ra khi thanh toán.';
};

const AIPricingModal: React.FC<AIPricingModalProps> = ({ isOpen, onClose }) => {
  const [category, setCategory] = useState<PackageCategory>('Normal');
  const [selectedPackage, setSelectedPackage] = useState<AIPackage | null>(null);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [eligibleForDiscount, setEligibleForDiscount] = useState(false);
  const [activePackage, setActivePackage] = useState<any>(null);
  const [customTokenAmount, setCustomTokenAmount] = useState<number>(50000);

  useEffect(() => {
    if (isOpen) {
      studentService.getSubscriptionStatus()
        .then((res) => {
          const info = res?.message || res?.data?.message || res;
          if (info && info.eligible_for_upgrade_discount) {
            setEligibleForDiscount(true);
          }
          if (info && info.active) {
            setActivePackage(info);
          }
        })
        .catch((err) => console.error('Error fetching subscription status:', err));
    }
  }, [isOpen]);

  const getCustomDiscountPercent = () => {
    if (customTokenAmount >= 1000000) return 30;
    if (customTokenAmount >= 500000) return 20;
    if (customTokenAmount >= 200000) return 10;
    return 0;
  };

  const getCustomBasePrice = () => {
    return (customTokenAmount / 50000) * 150000;
  };

  const getCustomPrice = () => {
    const basePrice = getCustomBasePrice();
    const discount = getCustomDiscountPercent();
    return basePrice * (1 - discount / 100);
  };

  const isPackageDisabled = (pkgId: string) => {
    if (pkgId === 'Custom_Monthly') return false;
    if (!activePackage || !activePackage.active) return false;
    
    const currentType = activePackage.package_type;
    if (currentType === 'Custom' || currentType === 'Token Lẻ') return false;

    if (currentType === 'Pro' || currentType === 'Pro_Monthly' || currentType === 'Pro_Yearly') {
      return true;
    }
    
    if (currentType === 'Normal' || currentType === 'Monthly' || currentType === 'Yearly') {
      if (pkgId === 'Monthly' || pkgId === 'Yearly') return true;
      return false;
    }
    
    return false;
  };

  const getButtonLabel = (pkgId: string) => {
    if (pkgId === 'Custom_Monthly') return 'Đăng ký ngay';
    if (!activePackage || !activePackage.active) return 'Đăng ký ngay';
    
    const currentType = activePackage.package_type;
    if (currentType === 'Custom' || currentType === 'Token Lẻ') return 'Đăng ký ngay';
    
    if (currentType === 'Pro' || currentType === 'Pro_Monthly' || currentType === 'Pro_Yearly') {
      return 'Chỉ có thể mua Token Lẻ';
    }
    
    if (currentType === 'Normal' || currentType === 'Monthly' || currentType === 'Yearly') {
      if (pkgId === 'Monthly' || pkgId === 'Yearly') {
        return 'Bạn đang có gói Thường';
      } else {
        return 'Nâng cấp lên Pro';
      }
    }
    
    return 'Đăng ký ngay';
  };

  if (!isOpen) return null;

  const getPackagePriceAndAmount = (pkg: AIPackage) => {
    if (pkg.id === 'Custom_Monthly') {
      const amount = getCustomPrice();
      const basePrice = getCustomBasePrice();
      const discount = getCustomDiscountPercent();
      return {
        price: `${amount.toLocaleString('vi-VN')}đ`,
        amount: amount,
        oldPrice: discount > 0 ? `${basePrice.toLocaleString('vi-VN')}đ` : undefined,
        discountPercent: discount
      };
    }
    if (eligibleForDiscount && (pkg.id === 'Pro_Monthly' || pkg.id === 'Pro_Yearly')) {
      const discountedAmount = pkg.id === 'Pro_Monthly' ? 298500 : 1648500;
      const discountedPriceText = pkg.id === 'Pro_Monthly' ? '298.500đ' : '1.648.500đ';
      return {
        price: discountedPriceText,
        amount: discountedAmount,
        oldPrice: pkg.price
      };
    }
    return {
      price: pkg.price,
      amount: pkg.amount,
      oldPrice: undefined
    };
  };

  const handleSelectPackage = (pkg: AIPackage) => {
    const pricing = getPackagePriceAndAmount(pkg);
    setSelectedPackage({
      ...pkg,
      price: pricing.price,
      amount: pricing.amount
    });
  };

  const handlePay = async () => {
    if (!selectedPackage) return;
    try {
      setLoading(true);
      
      const packageId = selectedPackage.id === 'Custom_Monthly' ? `Custom_${customTokenAmount}` : selectedPackage.id;
      
      const res = await studentService.createSubscriptionOrder(
        packageId,
        selectedPackage.amount
      );
      
      if (res && res.success && res.payment_url) {
        window.location.href = res.payment_url;
      } else {
        throw new Error(res?.message || 'Không thể tạo liên kết thanh toán.');
      }
      
    } catch (err) {
      console.error('Payment error:', err);
      alert(getErrorMessage(err));
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedPackage(null);
    setSuccessMessage('');
    onClose();
    if (successMessage) window.location.reload();
  };

  const currentPackages = packagesRecord[category];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md transition-all duration-300">
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-5xl max-h-[90vh] overflow-y-auto shadow-2xl relative border border-slate-100 dark:border-slate-800">
        
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all duration-200"
          aria-label="Đóng"
        >
          <XMarkIcon className="w-6 h-6" />
        </button>

        {successMessage ? (
          <div className="p-12 text-center max-w-md mx-auto">
            <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/10">
              <CheckCircleIcon className="w-12 h-12" />
            </div>
            <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Đăng Ký Thành Công</h2>
            <p className="mt-4 text-slate-600 dark:text-slate-400 leading-relaxed">{successMessage}</p>
            <button
              onClick={handleClose}
              className="mt-8 w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl transition duration-200 shadow-md shadow-blue-500/20"
            >
              Trở về Trang Chủ
            </button>
          </div>
        ) : selectedPackage ? (
          <div className="p-8 max-w-lg mx-auto">
            <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white text-center tracking-tight">Thanh toán qua VNPAY</h2>
            <p className="mt-3 text-slate-600 dark:text-slate-400 text-center leading-relaxed">
              Bạn đang thực hiện đăng ký gói dịch vụ AI. Hệ thống sẽ tự động chuyển hướng đến cổng thanh toán bảo mật VNPAY.
            </p>

            <div className="mt-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 p-6 space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">Gói đã chọn</span>
                <span className="font-bold text-slate-950 dark:text-white">{selectedPackage.title}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">Tổng thanh toán</span>
                <span className="text-2xl font-extrabold text-blue-600 dark:text-blue-400">
                  {selectedPackage.amount.toLocaleString('vi-VN')} VNĐ
                </span>
              </div>
            </div>

            <div className="mt-8 flex gap-4">
              <button
                onClick={() => setSelectedPackage(null)}
                className="flex-1 py-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition"
              >
                Quay lại
              </button>
              <button
                onClick={handlePay}
                disabled={loading}
                className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold transition shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:shadow-none"
              >
                {loading ? 'Đang kết nối...' : 'Xác nhận thanh toán'}
              </button>
            </div>
          </div>
        ) : (
          <div className="p-8 md:p-12">
            
            {/* Header */}
            <div className="text-center max-w-xl mx-auto mb-10">
              <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Nâng cấp Gói AI Thông Minh
              </h2>
              <p className="text-slate-600 dark:text-slate-400 mt-3 text-base leading-relaxed">
                Tăng tốc giảng dạy và học tập với sự hỗ trợ từ các mô hình AI tiên tiến nhất hiện nay.
              </p>
            </div>

            {/* Toggle Switch */}
            <div className="flex justify-center mb-12">
              <div className="relative flex p-1 bg-slate-100 dark:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-700 max-w-md w-full shadow-inner">
                {/* Active Indicator Slide */}
                <div
                  className={`absolute top-1 bottom-1 bg-white dark:bg-slate-900 rounded-full shadow-md transition-all duration-300 ease-out ${
                    category === 'Normal' ? 'left-1 w-[32%]' : category === 'Pro' ? 'left-[34%] w-[32%]' : 'left-[67%] w-[32%]'
                  }`}
                />
                
                {/* Button Normal */}
                <button
                  type="button"
                  onClick={() => setCategory('Normal')}
                  className={`relative z-10 flex-1 py-3 text-center text-sm font-bold transition-all duration-200 rounded-full ${
                    category === 'Normal'
                      ? 'text-blue-600 dark:text-white'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  AI Thường
                </button>
                
                {/* Button Pro */}
                <button
                  type="button"
                  onClick={() => setCategory('Pro')}
                  className={`relative z-10 flex-1 py-3 text-center text-sm font-bold transition-all duration-200 rounded-full ${
                    category === 'Pro'
                      ? 'text-indigo-600 dark:text-white'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  AI Pro
                </button>

                {/* Button Custom */}
                <button
                  type="button"
                  onClick={() => setCategory('Custom')}
                  className={`relative z-10 flex-1 py-3 text-center text-sm font-bold transition-all duration-200 rounded-full ${
                    category === 'Custom'
                      ? 'text-emerald-600 dark:text-white'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  Token Lẻ
                </button>
              </div>
            </div>

            {/* Upgrade Discount Notification Banner */}
            {eligibleForDiscount && category === 'Pro' && (
              <div className="max-w-4xl mx-auto mb-8 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border border-amber-500/30 rounded-2xl p-4 text-center">
                <span className="text-amber-800 dark:text-amber-300 font-bold text-sm">
                  🎉 Tài khoản của bạn đủ điều kiện nhận ưu đãi nâng cấp: giảm giá 25% cho tất cả gói AI Pro!
                </span>
              </div>
            )}

            {activePackage && (
              <div className="max-w-4xl mx-auto mb-8 bg-blue-50/50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-blue-800 dark:text-blue-300">Tài khoản của bạn đã được nâng cấp!</h4>
                  <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">Bạn đang sử dụng gói: <span className="font-bold">{activePackage.package_type || 'AI'}</span></p>
                </div>
                <div className="bg-blue-100 dark:bg-blue-800/50 text-blue-700 dark:text-blue-300 px-3 py-1.5 rounded-lg text-sm font-bold">
                  {activePackage.tokens_left?.toLocaleString('vi-VN')} Tokens khả dụng
                </div>
              </div>
            )}

            {/* Pricing Cards Grid */}
            <div className={`grid grid-cols-1 ${category === 'Custom' ? 'md:grid-cols-1 max-w-2xl' : 'md:grid-cols-2'} gap-8 max-w-4xl mx-auto`}>
              {currentPackages.map((pkg) => {
                const isPro = category === 'Pro';
                const pricing = getPackagePriceAndAmount(pkg);
                return (
                  <div
                    key={pkg.id}
                    className={`border-2 rounded-3xl p-8 relative flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl ${
                      pkg.featured
                        ? isPro
                          ? 'border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/10 shadow-xl shadow-indigo-500/5'
                          : 'border-blue-500 bg-blue-50/40 dark:bg-blue-950/10 shadow-xl shadow-blue-500/5'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm'
                    }`}
                  >
                    {/* Badge */}
                    {pkg.badge && (
                      <div className="absolute top-0 right-8 transform -translate-y-1/2">
                        <span className={`text-white text-xs font-black px-4 py-1.5 rounded-full uppercase tracking-widest shadow-md ${
                          isPro
                            ? 'bg-gradient-to-r from-indigo-600 to-violet-600'
                            : 'bg-gradient-to-r from-blue-600 to-indigo-600'
                        }`}>
                          {pkg.badge}
                        </span>
                      </div>
                    )}

                    <div>
                      {/* Package Name */}
                      <div className="flex justify-between items-center">
                        <h3 className="text-xl font-bold text-slate-800 dark:text-white">{pkg.title}</h3>
                        <span className="text-xs font-bold px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg">
                          Hạn mức: {pkg.limit}
                        </span>
                      </div>

                      {/* Pricing */}
                      <div className="mt-6 mb-8 flex flex-col">
                        <div className="flex items-baseline">
                          <span className={`text-5xl font-black tracking-tight ${
                            pkg.featured 
                              ? isPro ? 'text-indigo-600 dark:text-indigo-400' : 'text-blue-600 dark:text-blue-400'
                              : 'text-slate-900 dark:text-white'
                          }`}>
                            {pricing.price}
                          </span>
                          <span className="text-slate-500 dark:text-slate-400 ml-1 text-sm font-semibold">{pkg.suffix}</span>
                        </div>
                        {pricing.oldPrice && (
                          <div className="mt-1 flex items-center gap-2">
                            <span className="text-sm line-through text-slate-400 font-semibold">{pricing.oldPrice}</span>
                            <span className="text-xs font-bold px-2 py-0.5 bg-rose-500/10 text-rose-500 rounded">Giảm {(pricing as any).discountPercent || 25}%</span>
                          </div>
                        )}
                      </div>

                      {/* Custom Token Slider */}
                      {pkg.id === 'Custom_Monthly' && (() => {
                        const discount = getCustomDiscountPercent();
                        const basePrice = getCustomBasePrice();
                        const finalPrice = getCustomPrice();
                        return (
                          <div className="mb-8 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                            <div className="flex justify-between items-center mb-4">
                              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">
                                Chọn số lượng Token muốn mua:
                              </label>
                              {discount > 0 && (
                                <span className="text-xs font-bold px-2 py-0.5 bg-rose-500/10 text-rose-500 rounded">Giảm {discount}%</span>
                              )}
                            </div>
                            <input 
                              type="range" 
                              min="50000" 
                              max="1000000" 
                              step="50000" 
                              value={customTokenAmount}
                              onChange={(e) => setCustomTokenAmount(Number(e.target.value))}
                              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-700 accent-emerald-500"
                            />
                            <div className="mt-4 flex justify-between items-center w-full">
                              <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{customTokenAmount.toLocaleString('vi-VN')} Tokens</span>
                              <div className="text-right flex flex-col items-end">
                                {discount > 0 && <div className="text-xs line-through text-slate-400">{basePrice.toLocaleString('vi-VN')}đ</div>}
                                <div className="text-sm font-bold text-slate-700 dark:text-slate-300">= {finalPrice.toLocaleString('vi-VN')}đ</div>
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Features List */}
                      <ul className="space-y-4 mb-8">
                        {pkg.features.map((feature) => (
                          <li key={feature} className="flex items-start text-sm text-slate-600 dark:text-slate-300 leading-snug">
                            <CheckCircleIcon className="w-5 h-5 text-emerald-500 mr-2.5 flex-shrink-0 mt-0.5" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Subscription Button */}
                    <button
                      onClick={() => handleSelectPackage(pkg)}
                      disabled={isPackageDisabled(pkg.id)}
                      className={`w-full py-3.5 px-4 font-bold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                        pkg.featured
                          ? isPro
                            ? 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white hover:shadow-lg hover:shadow-indigo-500/20'
                            : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white hover:shadow-lg hover:shadow-blue-500/20'
                          : category === 'Custom'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20'
                            : isPro
                              ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-500/20'
                              : 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-500/20'
                      }`}
                    >
                      {getButtonLabel(pkg.id)}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIPricingModal;
