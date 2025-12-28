import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useApp } from "../context/AppContext";
import { supabase } from "../services/supabase";
import { generatePayslip } from "../utils/pdfGenerator";
import {
  DollarSign,
  Download,
  FileText,
  Calendar,
  Search,
  Eye,
  TrendingUp,
  Wallet,
} from "lucide-react";
import Loading from "../components/common/Loading";

export default function EmployeePayslip() {
  const { user } = useAuth();
  const { showError, showSuccess } = useApp();
  const [payslips, setPayslips] = useState([]);
  const [filteredPayslips, setFilteredPayslips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPayslip, setSelectedPayslip] = useState(null);
  const [searchMonth, setSearchMonth] = useState("");
  const [searchYear, setSearchYear] = useState("");
  const [stats, setStats] = useState({
    totalEarnings: 0,
    totalDeductions: 0,
    averageNetSalary: 0,
  });

  useEffect(() => {
    fetchPayslips();
  }, [user]);

  useEffect(() => {
    filterPayslips();
  }, [searchMonth, searchYear, payslips]);

  const fetchPayslips = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("payrolls")
        .select("*")
        .eq("employee_id", user.id)
        .order("pay_period_end", { ascending: false });

      if (error) throw error;

      setPayslips(data || []);
      setFilteredPayslips(data || []);
      calculateStats(data || []);
    } catch (error) {
      console.error("Error fetching payslips:", error);
      showError("Failed to fetch payslips");
    }
    setLoading(false);
  };

  const calculateStats = (data) => {
    const totalEarnings = data.reduce(
      (sum, p) =>
        sum +
        (parseFloat(p.basic_salary) || 0) +
        (parseFloat(p.allowances) || 0) +
        (parseFloat(p.overtime_pay) || 0) +
        (parseFloat(p.bonus) || 0) +
        (parseFloat(p.holiday_pay) || 0) +
        (parseFloat(p.other_earnings) || 0),
      0
    );
    const totalDeductions = data.reduce((sum, p) => sum + getTotalDeductions(p), 0);
    const averageNetSalary =
      data.length > 0
        ? data.reduce((sum, p) => sum + (parseFloat(p.net_salary) || 0), 0) /
          data.length
        : 0;
    setStats({ totalEarnings, totalDeductions, averageNetSalary });
  };

  const filterPayslips = () => {
    let filtered = [...payslips];
    if (searchMonth) {
      filtered = filtered.filter((p) => {
        const month = new Date(p.pay_period_end).getMonth() + 1;
        return month === parseInt(searchMonth);
      });
    }
    if (searchYear) {
      filtered = filtered.filter((p) => {
        const year = new Date(p.pay_period_end).getFullYear();
        return year === parseInt(searchYear);
      });
    }
    setFilteredPayslips(filtered);
  };

  const formatCurrency = (a) =>
    new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
    }).format(a || 0);

  const formatDate = (d) =>
    d
      ? new Date(d).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "N/A";

  const getMonthYear = (d) =>
    d
      ? new Date(d).toLocaleDateString("en-GB", {
          month: "long",
          year: "numeric",
        })
      : "N/A";

  const getCustomLabel = (comments, type) => {
    if (!comments) return null;
    const parts = String(comments).split(" | ").map((part) => part.trim());
    const prefix = `${type}: `;
    const match = parts.find((part) => part.startsWith(prefix));
    return match ? match.slice(prefix.length) : null;
  };

  const getVisibleComments = (comments) => {
    if (!comments) return "";
    return String(comments)
      .split(" | ")
      .map((part) => part.trim())
      .filter((part) => part && !part.startsWith("Earning: ") && !part.startsWith("Deduction: "))
      .join(" | ");
  };

  // Compute total deductions across all components
  const getTotalDeductions = (p) =>
    (parseFloat(p?.deductions) || 0) +
    (parseFloat(p?.tax) || 0) +
    (parseFloat(p?.pension) || 0) +
    (parseFloat(p?.loan_repayment) || 0) +
    (parseFloat(p?.insurance) || 0) +
    (parseFloat(p?.other_deductions) || 0) +
    (parseFloat(p?.nhf) || 0) +
    (parseFloat(p?.loan_deduction) || 0);

  const downloadPayslip = async (p) => {
    try {
      const { data: emp, error } = await supabase
        .from("employees")
        .select("*")
        .eq("id", user.id)
        .single();
      if (error) throw error;
      await generatePayslip(p, emp);
      showSuccess("Payslip downloaded successfully");
    } catch {
      showError("Failed to generate PDF");
    }
  };

  const clearFilters = () => {
    setSearchMonth("");
    setSearchYear("");
  };

  const months = [
    { value: "1", label: "January" },
    { value: "2", label: "February" },
    { value: "3", label: "March" },
    { value: "4", label: "April" },
    { value: "5", label: "May" },
    { value: "6", label: "June" },
    { value: "7", label: "July" },
    { value: "8", label: "August" },
    { value: "9", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" },
  ];
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  if (loading) return <Loading />;

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
          My Payslips
        </h1>
        <p className="text-gray-600 mt-1 text-sm md:text-base">
          View and download your salary statements
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 lg:gap-6">
        {[
          {
            title: "Total Earnings",
            value: stats.totalEarnings,
            color: "from-blue-500 to-blue-600",
            icon: <TrendingUp className="w-5 h-5 md:w-6 md:h-6" />,
          },
          {
            title: "Total Deductions",
            value: stats.totalDeductions,
            color: "from-red-500 to-red-600",
            icon: <DollarSign className="w-5 h-5 md:w-6 md:h-6" />,
          },
          {
            title: "Average Net Salary",
            value: stats.averageNetSalary,
            color: "from-green-500 to-green-600",
            icon: <Wallet className="w-5 h-5 md:w-6 md:h-6" />,
          },
        ].map((card) => (
          <div
            key={card.title}
            className={`bg-gradient-to-br ${card.color} rounded-lg p-3 md:p-5 lg:p-6 text-white shadow-md`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/70 text-xs md:text-sm">{card.title}</p>
                <p className="text-xl md:text-2xl font-bold mt-2">
                  {formatCurrency(card.value)}
                </p>
              </div>
              <div className="bg-white bg-opacity-20 p-2 md:p-3 rounded-lg">
                {card.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-3 md:p-5">
        <div className="flex items-center gap-2 mb-3 md:mb-4">
          <Search className="w-5 h-5 text-gray-600" />
          <h3 className="text-base md:text-lg font-semibold text-gray-900">
            Filter Payslips
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
          <select
            value={searchMonth}
            onChange={(e) => setSearchMonth(e.target.value)}
            className="px-3 md:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm md:text-base"
          >
            <option value="">All Months</option>
            {months.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
          <select
            value={searchYear}
            onChange={(e) => setSearchYear(e.target.value)}
            className="px-3 md:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm md:text-base"
          >
            <option value="">All Years</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <button
            onClick={clearFilters}
            className="px-3 md:px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition text-sm md:text-base"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Payslip Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 lg:gap-6">
        {filteredPayslips.length === 0 ? (
          <div className="col-span-full">
            <div className="bg-white rounded-lg shadow-md p-10 text-center">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No Payslips Found
              </h3>
              <p className="text-gray-600 text-sm md:text-base">
                You don't have any payslips yet.
              </p>
            </div>
          </div>
        ) : (
          filteredPayslips.map((p) => (
            <div
              key={p.id}
              className="bg-white rounded-lg shadow-md hover:shadow-lg transition overflow-hidden border border-gray-200"
            >
              <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-4 text-white">
                <div className="flex items-center justify-between mb-2">
                  <Calendar className="w-5 h-5" />
                  <span
                    className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      p.status === "paid"
                        ? "bg-green-400 text-green-900"
                        : "bg-yellow-400 text-yellow-900"
                    }`}
                  >
                    {p.status}
                  </span>
                </div>
                <h3 className="text-lg font-bold">
                  {getMonthYear(p.pay_period_end)}
                </h3>
                <p className="text-purple-100 text-sm">
                  Payslip #{p.payslip_no}
                </p>
              </div>
              <div className="p-4 space-y-3 text-sm md:text-base">
                <div className="flex justify-between">
                  <span className="text-gray-600">Period</span>
                  <span className="text-gray-900">
                    {formatDate(p.pay_period_start)} - {formatDate(p.pay_period_end)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Gross Salary</span>
                  <span className="font-semibold text-gray-900">
                    {formatCurrency(p.gross_salary)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Deductions</span>
                  <span className="font-semibold text-red-600">
                    -{formatCurrency(getTotalDeductions(p))}
                  </span>
                </div>
                <div className="border-t pt-2 mt-2 flex justify-between font-semibold">
                  <span className="text-gray-800">Net Salary</span>
                  <span className="text-green-600 text-lg">
                    {formatCurrency(p.net_salary)}
                  </span>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 flex gap-2">
                <button
                  onClick={() => setSelectedPayslip(p)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
                >
                  <Eye className="w-4 h-4" /> View
                </button>
                <button
                  onClick={() => downloadPayslip(p)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-medium"
                >
                  <Download className="w-4 h-4" /> Download
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Responsive Payslip Detail Modal */}
      {selectedPayslip && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 md:p-6"
          onClick={(e) => e.target === e.currentTarget && setSelectedPayslip(null)}
        >
          <div className="bg-white rounded-lg max-w-lg md:max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-lg">
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-4 md:px-6 py-3 md:py-4 text-white flex justify-between items-center">
              <div>
                <h2 className="text-lg md:text-xl font-bold">
                  Payslip Details
                </h2>
                <p className="text-purple-100 text-xs md:text-sm">
                  {getMonthYear(selectedPayslip.pay_period_end)}
                </p>
              </div>
              <button
                onClick={() => setSelectedPayslip(null)}
                className="text-white text-2xl hover:bg-white hover:bg-opacity-20 px-3 py-1 rounded-lg transition"
              >
                ×
              </button>
            </div>

            <div className="p-4 md:p-6 space-y-5 text-sm md:text-base">
              {/* Info Grid */}
              <div className="bg-gray-50 rounded-lg p-3 md:p-4">
                <h3 className="font-semibold text-gray-700 mb-2">
                  Basic Information
                </h3>
                <div className="grid grid-cols-2 gap-3 md:gap-4">
                  <p>
                    <span className="text-gray-600 block text-xs">Payslip No</span>
                    <span className="font-medium text-gray-900">
                      {selectedPayslip.payslip_no}
                    </span>
                  </p>
                  <p>
                    <span className="text-gray-600 block text-xs">Employee</span>
                    <span className="font-medium text-gray-900">
                      {selectedPayslip.employee_name}
                    </span>
                  </p>
                  <p>
                    <span className="text-gray-600 block text-xs">Start Date</span>
                    <span className="font-medium text-gray-900">
                      {formatDate(selectedPayslip.pay_period_start)}
                    </span>
                  </p>
                  <p>
                    <span className="text-gray-600 block text-xs">End Date</span>
                    <span className="font-medium text-gray-900">
                      {formatDate(selectedPayslip.pay_period_end)}
                    </span>
                  </p>
                </div>
              </div>

              {/* Earnings */}
              <div>
                <h3 className="font-semibold text-gray-700 mb-2">Earnings</h3>
                <div className="space-y-2">
                  <div className="flex justify-between bg-green-50 rounded-lg p-2 md:p-3">
                    <span>Basic Salary</span>
                    <span className="font-semibold">
                      {formatCurrency(selectedPayslip.basic_salary)}
                    </span>
                  </div>
                  {selectedPayslip.allowances > 0 && (
                    <div className="flex justify-between bg-green-50 rounded-lg p-2 md:p-3">
                      <span>Allowances</span>
                      <span className="font-semibold">
                        {formatCurrency(selectedPayslip.allowances)}
                      </span>
                    </div>
                  )}
                  {selectedPayslip.other_earnings > 0 && (
                    <div className="flex justify-between bg-green-50 rounded-lg p-2 md:p-3">
                      <span>
                        {getCustomLabel(selectedPayslip.comments, "Earning") || "Other Earnings"}
                      </span>
                      <span className="font-semibold">
                        {formatCurrency(selectedPayslip.other_earnings)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between bg-blue-100 rounded-lg p-2 md:p-3 font-semibold">
                    <span>Gross Salary</span>
                    <span className="text-blue-700">
                      {formatCurrency(selectedPayslip.gross_salary)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Deductions */}
              <div>
                <h3 className="font-semibold text-gray-700 mb-2">Deductions</h3>
                <div className="space-y-2">
                  {[
                    { label: 'Tax', value: selectedPayslip.tax },
                    { label: 'Pension', value: selectedPayslip.pension },
                    { label: 'Loan Repayment', value: selectedPayslip.loan_repayment },
                    { label: 'Insurance', value: selectedPayslip.insurance },
                    { label: 'NHF', value: selectedPayslip.nhf },
                    { label: 'Loan Deduction', value: selectedPayslip.loan_deduction },
                    {
                      label: getCustomLabel(selectedPayslip.comments, "Deduction") || 'Other Deductions',
                      value: selectedPayslip.other_deductions,
                    },
                    { label: 'General Deductions', value: selectedPayslip.deductions },
                  ].map((item) =>
                    parseFloat(item.value) > 0 ? (
                      <div
                        key={item.label}
                        className="flex justify-between bg-red-50 rounded-lg p-2 md:p-3"
                      >
                        <span>{item.label}</span>
                        <span>{formatCurrency(item.value)}</span>
                      </div>
                    ) : null
                  )}
                  <div className="flex justify-between bg-red-100 rounded-lg p-2 md:p-3 font-semibold">
                    <span>Total Deductions</span>
                    <span className="text-red-700">
                      {formatCurrency(getTotalDeductions(selectedPayslip))}
                    </span>
                  </div>
                </div>
              </div>

              {getVisibleComments(selectedPayslip.comments) && (
                <div className="bg-gray-50 rounded-lg p-3 md:p-4">
                  <h3 className="font-semibold text-gray-700 mb-2">Notes</h3>
                  <p className="text-sm text-gray-600 whitespace-pre-line">
                    {getVisibleComments(selectedPayslip.comments)}
                  </p>
                </div>
              )}

              {/* Net Salary */}
              <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-4 md:p-6 text-white">
                <p className="text-green-100 text-xs md:text-sm mb-1">
                  Net Salary (Take Home)
                </p>
                <p className="text-3xl md:text-4xl font-bold">
                  {formatCurrency(selectedPayslip.net_salary)}
                </p>
              </div>

              {/* Actions */}
              <div className="flex flex-col md:flex-row gap-3 pt-2 md:pt-4 border-t">
                <button
                  onClick={() => downloadPayslip(selectedPayslip)}
                  className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 md:py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold"
                >
                  <Download className="w-5 h-5" /> Download PDF
                </button>
                <button
                  onClick={() => setSelectedPayslip(null)}
                  className="flex-1 border border-gray-300 rounded-lg px-5 py-2.5 md:py-3 hover:bg-gray-50 font-semibold text-gray-700 transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

