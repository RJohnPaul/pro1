/* eslint-disable prefer-const */
import React, { useState, useEffect } from "react";
import {
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Menu,
  MenuItem,
  TextField,
  Button,
  TablePagination,
  Box,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TableSortLabel,
  FormControl,
  InputLabel,
  Select,
  CircularProgress,
} from "@mui/material";
import { Search as SearchIcon } from '@mui/icons-material';
import CloseIcon from '@mui/icons-material/Close';
import StatGroup from './StatGroup';
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import { Users } from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { ReactNode } from 'react';
import { SelectChangeEvent } from "@mui/material/Select";
import { useNavigate } from "react-router-dom";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const cardConfig = [
  { title: "TOTAL AMOUNT PENDING", value: "Loading...", Icon: Users, path: "/pending" },
];

interface FeePendingData {
  sno: number;
  member_id: number;
  member_name: string;
  pending_amount: string;
  member_phone: string;
  pending_exp_date: string;
}

interface MetricsRecord {
  collected_month: string;
  collected_today: string;
  trans_done: string;
  last_updated?: string;
}

interface PaymentFormData {
  member_id: number;
  member_name: string;
  pending_amount: string;
  payment_amount: string;
  payment_mode: string;
  bill_date: string;
}

interface TransactionData {
  sno: number;
  bill_date: string;
  emp_id: string;
  member_name: string;
  payment_mode: string;
  total_amount_received: string;
  pending: string;
  state: string;
  total_paid: string;
}

const tableHeaders = [
  { id: "sno", label: "S.NO" },
  { id: "member_id", label: "MEMBER ID" },
  { id: "member_name", label: "MEMBER NAME" },
  { id: "pending_amount", label: "PENDING AMOUNT" },
  { id: "member_phone", label: "MEMBER PHONE NUMBER" },
  { id: "pending_exp_date", label: "PENDING EXP DATE" },
  { id: "actions", label: "ACTIONS", disableSorting: true },
];

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const transactionTableHeaders = [
  { id: "sno", label: "TRANSACTION ID" },
  { id: "bill_date", label: "BILL DATE" },
  { id: "member_name", label: "MEMBER NAME" },
  { id: "total_amount_received", label: "AMOUNT" },
  { id: "pending", label: "PENDING" },
  { id: "payment_mode", label: "PAYMENT MODE" },
  { id: "state", label: "STATUS" },
];

const formatDate = (dateString: string) => {
  if (!dateString) return "";
  try {
    const [year, month, day] = dateString.split('-');
    return `${day}-${month}-${year}`;
  } catch {
    return dateString;
  }
};

// Add this custom pagination component before the main Members component
const TablePaginationActions = (props: {
  count: number;
  page: number;
  rowsPerPage: number;
  onPageChange: (event: React.MouseEvent<HTMLButtonElement>, newPage: number) => void;
}) => {
  const { count, page, rowsPerPage, onPageChange } = props;
  const [showInput, setShowInput] = useState(false);
  const [inputPage, setInputPage] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputPage(e.target.value);
  };

  const handleInputSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const pageNumber = parseInt(inputPage, 10);
    if (!isNaN(pageNumber) && pageNumber > 0 && pageNumber <= Math.ceil(count / rowsPerPage)) {
      onPageChange(e as unknown as React.MouseEvent<HTMLButtonElement>, pageNumber - 1);
    }
    setShowInput(false);
    setInputPage('');
  };

  const renderPageNumbers = () => {
    const pageNumbers: ReactNode[] = [];
    const totalPages = Math.ceil(count / rowsPerPage);
    const currentPage = page + 1;

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(
          <Button
            key={i}
            onClick={(e) => onPageChange(e, i - 1)}
            variant={currentPage === i ? "contained" : "outlined"}
            size="small"
            sx={{ mx: 0.5, minWidth: '30px' }}
          >
            {i}
          </Button>
        );
      }
    } else {
      // Always show first page
      pageNumbers.push(
        <Button
          key={1}
          onClick={(e) => onPageChange(e, 0)}
          variant={currentPage === 1 ? "contained" : "outlined"}
          size="small"
          sx={{ mx: 0.5, minWidth: '30px' }}
        >
          1
        </Button>
      );

      if (currentPage <= 4) {
        for (let i = 2; i <= 5; i++) {
          pageNumbers.push(
            <Button
              key={i}
              onClick={(e) => onPageChange(e, i - 1)}
              variant={currentPage === i ? "contained" : "outlined"}
              size="small"
              sx={{ mx: 0.5, minWidth: '30px' }}
            >
              {i}
            </Button>
          );
        }
        pageNumbers.push(
          <Button key="dots1" onClick={() => setShowInput(true)}>
            ...
          </Button>
        );
      } else if (currentPage >= totalPages - 3) {
        pageNumbers.push(
          <Button key="dots1" onClick={() => setShowInput(true)}>
            ...
          </Button>
        );
        for (let i = totalPages - 4; i < totalPages; i++) {
          pageNumbers.push(
            <Button
              key={i}
              onClick={(e) => onPageChange(e, i - 1)}
              variant={currentPage === i ? "contained" : "outlined"}
              size="small"
              sx={{ mx: 0.5, minWidth: '30px' }}
            >
              {i}
            </Button>
          );
        }
      } else {
        pageNumbers.push(
          <Button key="dots1" onClick={() => setShowInput(true)}>
            ...
          </Button>
        );
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pageNumbers.push(
            <Button
              key={i}
              onClick={(e) => onPageChange(e, i - 1)}
              variant={currentPage === i ? "contained" : "outlined"}
              size="small"
              sx={{ mx: 0.5, minWidth: '30px' }}
            >
              {i}
            </Button>
          );
        }
        pageNumbers.push(
          <Button key="dots2" onClick={() => setShowInput(true)}>
            ...
          </Button>
        );
      }

      pageNumbers.push(
        <Button
          key={totalPages}
          onClick={(e) => onPageChange(e, totalPages - 1)}
          variant={currentPage === totalPages ? "contained" : "outlined"}
          size="small"
          sx={{ mx: 0.5, minWidth: '30px' }}
        >
          {totalPages}
        </Button>
      );
    }

    return pageNumbers;
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      {renderPageNumbers()}
      {showInput && (
        <form onSubmit={handleInputSubmit}>
          <TextField
            size="small"
            value={inputPage}
            onChange={handleInputChange}
            onBlur={() => setShowInput(false)}
            autoFocus
            sx={{ width: '50px', mx: 0.5 }}
          />
        </form>
      )}
    </Box>
  );
};

const FeePending = () => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const navigate = useNavigate();
  const [feePendingData, setFeePendingData] = useState<FeePendingData[]>([]);
  const [filteredFeePendingData, setFilteredFeePendingData] = useState<FeePendingData[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [order, setOrder] = useState<"asc" | "desc">("asc");
  const [orderBy, setOrderBy] = useState<keyof FeePendingData>("sno");
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openPayBillDialog, setOpenPayBillDialog] = useState(false);
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<FeePendingData | null>(null);
  const [totalPendingAmount, setTotalPendingAmount] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);
  const [memberTransactions, setMemberTransactions] = useState<TransactionData[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  
  const [paymentFormData, setPaymentFormData] = useState<PaymentFormData>({
    member_id: 0,
    member_name: "",
    pending_amount: "0",
    payment_amount: "0",
    payment_mode: "",
    bill_date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    fetchFeePendingData();
  }, []);

  useEffect(() => {
    applyFiltersAndSorting();
  }, [feePendingData, search, orderBy, order]);

  // Function to check for date changes
  const checkForDateChange = (lastUpdatedDate: string | null): { isNewDay: boolean; isNewMonth: boolean } => {
    if (!lastUpdatedDate) return { isNewDay: false, isNewMonth: false };

    const now = new Date();
    const lastUpdate = new Date(lastUpdatedDate);
    
    // Check if it's a new day
    const isNewDay = 
      now.getDate() !== lastUpdate.getDate() || 
      now.getMonth() !== lastUpdate.getMonth() ||
      now.getFullYear() !== lastUpdate.getFullYear();
    
    // Check if it's a new month
    const isNewMonth = 
      now.getMonth() !== lastUpdate.getMonth() ||
      now.getFullYear() !== lastUpdate.getFullYear();
    
    return { isNewDay, isNewMonth };
  };

  // Fetch transactions for a specific member
  const fetchMemberTransactions = async (memberId: number) => {
    try {
      setLoadingTransactions(true);
      
      // Get transactions for this member
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("emp_id", memberId.toString())
        .order("bill_date", { ascending: false });
      
      if (error) {
        toast.error(`Error fetching transactions: ${error.message}`);
        return;
      }

      // Filter transactions with pending > 0 (as a string comparison)
      const pendingTransactions = data?.filter(transaction => {
        const pendingAmount = parseFloat(transaction.pending || "0");
        return pendingAmount > 0;
      }) || [];
      
      if (pendingTransactions.length === 0) {
        toast.info("No pending transactions found for this member");
      }
      
      setMemberTransactions(pendingTransactions);
    } catch (err) {
      toast.error(`Unexpected error: ${err}`);
    } finally {
      setLoadingTransactions(false);
    }
  };

  // Create a metrics record if one doesn't exist
  const createMetricsRecord = async (): Promise<MetricsRecord | null> => {
    try {
      console.log("Creating new metrics record");
      
      const today = new Date().toISOString();
      
      // Create initial metrics record
      const { error } = await supabase
        .from("stat_card")
        .insert({
          sno: 1,
          collected_month: "0",
          collected_today: "0",
          trans_done: "0",
          last_updated: today
        });
      
      if (error) {
        console.error("Error creating metrics record:", error);
        
        // If the record already exists, try to select it
        if (error.code === '23505') { // Unique violation
          const { data: existingData } = await supabase
            .from("stat_card")
            .select("*")
            .eq("sno", 1)
            .single();
            
          if (existingData) {
            console.log("Retrieved existing metrics record instead of creating new");
            return existingData as MetricsRecord;
          }
        }
        return null;
      }
      
      return {
        collected_month: "0",
        collected_today: "0",
        trans_done: "0",
        last_updated: today
      };
    } catch (err) {
      console.error("Error in createMetricsRecord:", err);
      return null;
    }
  };

  // Initialize or reset metrics record based on date
  const resetMetricsIfNeeded = async (metrics: MetricsRecord): Promise<MetricsRecord> => {
    try {
      const { isNewDay, isNewMonth } = checkForDateChange(metrics.last_updated ?? null);
      const today = new Date().toISOString();
      let updatedMetrics = { ...metrics };
      
      if (isNewDay || isNewMonth) {
        // Reset values based on date change
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const updates: any = {
          last_updated: today
        };
        
        if (isNewDay) {
          console.log("Resetting daily metrics - new day detected");
          updates.collected_today = "0";
          updates.trans_done = "0";
          updatedMetrics.collected_today = "0";
          updatedMetrics.trans_done = "0";
        }
        
        if (isNewMonth) {
          console.log("Resetting monthly metrics - new month detected");
          updates.collected_month = "0";
          updatedMetrics.collected_month = "0";
        }
        
        // Update database
        const { error } = await supabase
          .from("stat_card")
          .update(updates)
          .eq("sno", 1);
          
        if (error) {
          console.error("Error resetting metrics:", error);
        }
      }
      
      return updatedMetrics;
    } catch (err) {
      console.error("Error in resetMetricsIfNeeded:", err);
      return metrics;
    }
  };

  // Update the metrics when a payment is processed
  const updateMetricsRecord = async (paymentAmount: number): Promise<boolean> => {
    try {
      console.log(`Processing payment metrics update: amount = ${paymentAmount}`);
      
      // Fetch current metrics
      const { data, error } = await supabase
        .from("stat_card")
        .select("*")
        .eq("sno", 1)
        .maybeSingle();
        
      if (error) {
        console.error("Error fetching current metrics:", error);
        
        // Try to create the record if it doesn't exist
        if (error.code === 'PGRST116') {
          await createMetricsRecord();
          return await updateMetricsRecord(paymentAmount); // Try again after creating
        }
        return false;
      }
      
      if (!data) {
        // Create new record if none exists
        const newMetrics = await createMetricsRecord();
        if (!newMetrics) return false;
        
        // Update the new record with this payment
        const paymentStr = paymentAmount.toString();
        const { error: updateError } = await supabase
          .from("stat_card")
          .update({
            collected_month: paymentStr,
            collected_today: paymentStr,
            trans_done: "1",
            last_updated: new Date().toISOString()
          })
          .eq("sno", 1);
          
        if (updateError) {
          console.error("Error updating new metrics record:", updateError);
          return false;
        }
        
        return true;
      }
      
      // Check for day/month change and reset if needed
      const metrics = await resetMetricsIfNeeded(data as MetricsRecord);
      
      // Parse current values to numbers
      const collectedMonth = parseFloat(metrics.collected_month || "0");
      const collectedToday = parseFloat(metrics.collected_today || "0");
      const transactionsDone = parseInt(metrics.trans_done || "0");
      
      // Add the new payment amount and increment transaction count
      const newCollectedMonth = collectedMonth + paymentAmount;
      const newCollectedToday = collectedToday + paymentAmount;
      const newTransactionsDone = transactionsDone + 1;
      
      console.log(`Metrics update: month=${collectedMonth} -> ${newCollectedMonth}, today=${collectedToday} -> ${newCollectedToday}, transactions=${transactionsDone} -> ${newTransactionsDone}`);
      
      // Update the database
      const { error: updateError } = await supabase
        .from("stat_card")
        .update({
          collected_month: newCollectedMonth.toString(),
          collected_today: newCollectedToday.toString(),
          trans_done: newTransactionsDone.toString(),
          last_updated: new Date().toISOString()
        })
        .eq("sno", 1);
      
      if (updateError) {
        console.error("Error updating metrics:", updateError);
        return false;
      }
      
      return true;
    } catch (err) {
      console.error("Error in updateMetricsRecord:", err);
      return false;
    }
  };

  const fetchFeePendingData = async () => {
    try {
      const { data, error } = await supabase
        .from("fee_pending")
        .select("*");

      if (error) {
        toast.error(`Error fetching data: ${error.message}`);
      } else {
        // Filter out records with pending_amount <= 0
        const filteredData = (data || []).filter(record => {
          const pendingAmount = parseFloat(record.pending_amount || "0");
          return pendingAmount > 0;
        });
        
        setFeePendingData(filteredData);
        calculateTotalPendingAmount(filteredData);
      }
    } catch (err) {
      toast.error(`Unexpected error: ${err}`);
    }
  };

  const calculateTotalPendingAmount = (data: FeePendingData[]) => {
    const total = data.reduce((acc, curr) => acc + parseFloat(curr.pending_amount), 0);
    setTotalPendingAmount(total);
  };

  useEffect(() => {
    // Update cardConfig with the fetched total pending amount
    cardConfig[0].value = totalPendingAmount.toString();
  }, [totalPendingAmount]);

  const applyFiltersAndSorting = () => {
    let filtered = [...feePendingData];

    // Apply search filter - improved to search through all fields
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = feePendingData.filter(item =>
        item.member_name.toLowerCase().includes(searchLower) ||
        item.member_id.toString().toLowerCase().includes(searchLower) ||
        item.member_phone.toLowerCase().includes(searchLower) ||
        item.pending_amount.toLowerCase().includes(searchLower) ||
        (item.pending_exp_date && item.pending_exp_date.toLowerCase().includes(searchLower))
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      if (orderBy === "sno" || orderBy === "member_id") {
        const valueA = a[orderBy];
        const valueB = b[orderBy];
  
        if (typeof valueA === 'number' && typeof valueB === 'number') {
          return order === "asc" ? valueA - valueB : valueB - valueA;
        }
        return 0;
      }
  
      if (orderBy === "pending_exp_date") {
        const dateA = new Date(a[orderBy] || "");
        const dateB = new Date(b[orderBy] || "");
        return order === "asc"
          ? dateA.getTime() - dateB.getTime()
          : dateB.getTime() - dateA.getTime();
      }
  
      if (orderBy === "pending_amount") {
        const numA = parseFloat(a[orderBy] || "0");
        const numB = parseFloat(b[orderBy] || "0");
        return order === "asc" ? numA - numB : numB - numA;
      }
  
      const compareA = String(a[orderBy] || "").toLowerCase();
      const compareB = String(b[orderBy] || "").toLowerCase();
      return order === "asc"
        ? compareA.localeCompare(compareB)
        : compareB.localeCompare(compareA);
    });

    setFilteredFeePendingData(filtered);
  };

  const handleSort = (property: keyof FeePendingData) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>, record: FeePendingData) => {
    setAnchorEl(event.currentTarget);
    setSelectedRecord(record);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleAction = async (action: string) => {
    handleClose();
    if (!selectedRecord) return;

    switch (action) {
      case "Pay Bill":
        setPaymentFormData({
          member_id: selectedRecord.member_id,
          member_name: selectedRecord.member_name,
          pending_amount: selectedRecord.pending_amount,
          payment_amount: selectedRecord.pending_amount, // Default to full amount
          payment_mode: "",
          bill_date: new Date().toISOString().split('T')[0],
        });
        setOpenPayBillDialog(true);
        break;
      case "View":
        // Fetch and display pending transactions for this member
        await fetchMemberTransactions(selectedRecord.member_id);
        setOpenViewDialog(true);
        break;
      case "Delete":
        try {
          const { error } = await supabase
            .from("fee_pending")
            .delete()
            .eq("sno", selectedRecord.sno);

          if (error) {
            toast.error(`Error deleting record: ${error.message}`);
          } else {
            toast.success("Record deleted successfully");
            fetchFeePendingData();
          }
        } catch (err) {
          toast.error(`Unexpected error: ${err}`);
        }
        break;
      default:
        console.log(`${action} clicked`);
    }
  };

  const handlePageChange = (_event: React.MouseEvent<HTMLButtonElement> | null, newPage: number) => {
    setPage(newPage);
  };

  const handleRowsPerPageChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleEditDialogClose = () => {
    setOpenEditDialog(false);
  };

  const handleViewDialogClose = () => {
    setOpenViewDialog(false);
    setMemberTransactions([]);
  };

  const handleEditSubmit = async () => {
    if (!selectedRecord) return;

    try {
      const { error } = await supabase
        .from("fee_pending")
        .update({
          member_id: selectedRecord.member_id,
          member_name: selectedRecord.member_name,
          pending_amount: selectedRecord.pending_amount,
          member_phone: selectedRecord.member_phone,
          pending_exp_date: selectedRecord.pending_exp_date,
        })
        .eq("sno", selectedRecord.sno);

      if (error) {
        toast.error(`Error updating record: ${error.message}`);
      } else {
        toast.success("Record updated successfully");
        fetchFeePendingData();
      }
    } catch (err) {
      toast.error(`Unexpected error: ${err}`);
    } finally {
      setOpenEditDialog(false);
    }
  };

  const handleEditChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setSelectedRecord(prev => prev ? { ...prev, [name]: value } : null);
  };

  // Payment form handlers
  const handlePaymentFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPaymentFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePaymentModeChange = (e: SelectChangeEvent<string>) => {
    setPaymentFormData(prev => ({
      ...prev,
      payment_mode: e.target.value
    }));
  };

  const handlePayBillClose = () => {
    setOpenPayBillDialog(false);
  };

  const handlePayBillSubmit = async () => {
    if (!selectedRecord) return;
    if (!paymentFormData.payment_mode) {
      toast.error("Please select a payment mode");
      return;
    }

    const paymentAmount = parseFloat(paymentFormData.payment_amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      toast.error("Please enter a valid payment amount");
      return;
    }

    const pendingAmount = parseFloat(paymentFormData.pending_amount);
    if (paymentAmount > pendingAmount) {
      toast.error("Payment amount cannot exceed pending amount");
      return;
    }

    try {
      setSubmitting(true);

      // Calculate new pending amount
      const newPendingAmount = Math.max(0, pendingAmount - paymentAmount);
      
      // Update the fee_pending record
      const { error: updateError } = await supabase
        .from("fee_pending")
        .update({
          pending_amount: newPendingAmount.toString(),
        })
        .eq("sno", selectedRecord.sno);

      if (updateError) {
        throw updateError;
      }

      // Create a transaction record if needed
      const { error: transactionError } = await supabase
        .from("transactions")
        .insert({
          bill_date: paymentFormData.bill_date,
          member_name: paymentFormData.member_name,
          emp_id: paymentFormData.member_id.toString(),
          payment_mode: paymentFormData.payment_mode,
          total_amount_received: paymentAmount.toString(),
          pending: newPendingAmount.toString(),
          state: newPendingAmount > 0 ? "Partially Paid" : "Paid",
          total_paid: paymentAmount.toString(),
        });

      if (transactionError) {
        console.error("Warning: Could not create transaction record:", transactionError);
      }

      // Update metrics in the stat_card table
      const metricsUpdated = await updateMetricsRecord(paymentAmount);

      if (!metricsUpdated) {
        console.warn("Failed to update metrics - but proceeding with payment");
      }

      toast.success("Payment processed successfully!");
      fetchFeePendingData(); // Refresh the list
      setOpenPayBillDialog(false);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error occurred";
      toast.error("Error processing payment: " + errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const paginatedMembers = filteredFeePendingData.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  // Calculate remaining amount after payment
  const pendingAmount = parseFloat(paymentFormData.pending_amount || "0");
  const paymentAmount = parseFloat(paymentFormData.payment_amount || "0");
  const remainingAfterPayment = Math.max(0, pendingAmount - paymentAmount);

  return (
    <div style={{ padding: "20px" }}>
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} newestOnTop closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover />
      <StatGroup stats={cardConfig} />

      <div className="flex-row justify-center text-center bg-white p-6 border-gray-300 border">
        <Typography variant="h5" style={{ marginBottom: "20px", color: "#71045F", fontWeight: "bold" }}>
          Fee Pending Details
        </Typography>

        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Box display="flex" alignItems="center" gap={2}>
            <Box sx={{ position: 'relative', width: "300px" }}>
              <TextField
                placeholder="Search Members"
                variant="outlined"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                fullWidth
                InputProps={{
                  startAdornment: (
                    <SearchIcon sx={{ color: 'action.active', mr: 1 }} />
                  ),
                }}
              />
            </Box>
            <TablePagination
              rowsPerPageOptions={[50, 60, 100]}
              component="div"
              count={filteredFeePendingData.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handlePageChange}
              onRowsPerPageChange={handleRowsPerPageChange}
              sx={{ border: 'none', '.MuiTablePagination-toolbar': { pl: 0 } }}
            />
          </Box>
        </Box>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                {tableHeaders.map((header) => (
                  <TableCell
                    key={header.id}
                    align="center"
                    sx={{
                      backgroundColor: "#F7EEF9",
                      fontWeight: "700",
                      cursor: header.disableSorting ? 'default' : 'pointer'
                    }}
                  >
                    {header.disableSorting ? (
                      header.label
                    ) : (
                      <TableSortLabel
                        active={orderBy === header.id}
                        direction={orderBy === header.id ? order : "asc"}
                        onClick={() => handleSort(header.id as keyof FeePendingData)}
                        sx={{
                          '&.MuiTableSortLabel-active': {
                            color: '#71045F',
                          },
                          '&.MuiTableSortLabel-active .MuiTableSortLabel-icon': {
                            color: '#71045F',
                          },
                        }}
                      >
                        {header.label}
                      </TableSortLabel>
                    )}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedMembers.length > 0 ? (
                paginatedMembers.map((member) => (
                  <TableRow key={member.sno}>
                    <TableCell align="center">{member.sno}</TableCell>
                    <TableCell align="center">{member.member_id}</TableCell>
                    <TableCell align="center">{member.member_name}</TableCell>
                    <TableCell align="center">{member.pending_amount}</TableCell>
                    <TableCell align="center">{member.member_phone}</TableCell>
                    <TableCell align="center">{formatDate(member.pending_exp_date)}</TableCell>
                    <TableCell align="center">
                      <Button
                        variant="contained"
                        aria-controls={anchorEl ? "actions-menu" : undefined}
                        aria-haspopup="true"
                        onClick={(event) => handleClick(event, member)}
                        endIcon={<ArrowDropDownIcon />}
                      >
                        Actions
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    No Members Found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <Menu
          id="actions-menu"
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleClose}
        >
          <MenuItem onClick={() => handleAction("Pay Bill")}>Pay Bill</MenuItem>
          <MenuItem onClick={() => handleAction("View")}>View</MenuItem>
          <MenuItem onClick={() => handleAction("Delete")}>Delete</MenuItem>
        </Menu>

        <TablePagination
          rowsPerPageOptions={[5, 10, 20]}
          component="div"
          count={filteredFeePendingData.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handlePageChange}
          onRowsPerPageChange={handleRowsPerPageChange}
          ActionsComponent={TablePaginationActions}
        />
      </div>

      {/* Edit Dialog */}
      <Dialog open={openEditDialog} onClose={handleEditDialogClose}>
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Edit Fee Pending Details</Typography>
            <IconButton aria-label="close" onClick={handleEditDialogClose} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <TextField
            margin="dense"
            label="Member ID"
            type="number"
            fullWidth
            name="member_id"
            value={selectedRecord?.member_id || ""}
            onChange={handleEditChange}
          />
          <TextField
            margin="dense"
            label="Member Name"
            type="text"
            fullWidth
            name="member_name"
            value={selectedRecord?.member_name || ""}
            onChange={handleEditChange}
          />
          <TextField
            margin="dense"
            label="Pending Amount"
            type="text"
            fullWidth
            name="pending_amount"
            value={selectedRecord?.pending_amount || ""}
            onChange={handleEditChange}
          />
          <TextField
            margin="dense"
            label="Member Phone"
            type="text"
            fullWidth
            name="member_phone"
            value={selectedRecord?.member_phone || ""}
            onChange={handleEditChange}
          />
          <TextField
            margin="dense"
            label="Pending Exp Date"
            type="date"
            fullWidth
            name="pending_exp_date"
            value={selectedRecord?.pending_exp_date || ""}
            onChange={handleEditChange}
            InputLabelProps={{
              shrink: true,
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleEditDialogClose}>Cancel</Button>
          <Button onClick={handleEditSubmit} color="primary">
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Simplified View Transactions Dialog */}
      <Dialog
        open={openViewDialog}
        onClose={handleViewDialogClose}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">
              {selectedRecord && (
                <>Pending Transactions for {selectedRecord.member_name}</>
              )}
            </Typography>
            <IconButton aria-label="close" onClick={handleViewDialogClose}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {loadingTransactions ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : memberTransactions.length > 0 ? (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: "bold" }}>Date</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>Amount</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>Pending</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>Payment Mode</TableCell>
                    <TableCell sx={{ fontWeight: "bold" }}>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {memberTransactions.map((transaction) => (
                    <TableRow key={transaction.sno}>
                      <TableCell>{formatDate(transaction.bill_date)}</TableCell>
                      <TableCell>₹{parseFloat(transaction.total_amount_received).toLocaleString()}</TableCell>
                      <TableCell>₹{parseFloat(transaction.pending).toLocaleString()}</TableCell>
                      <TableCell>{transaction.payment_mode}</TableCell>
                      <TableCell>{transaction.state}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Typography sx={{ p: 2 }}>No pending transactions found for this member.</Typography>
          )}
        </DialogContent>
      </Dialog>

      {/* Pay Bill Dialog */}
      <Dialog open={openPayBillDialog} onClose={handlePayBillClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Process Payment</Typography>
            <IconButton aria-label="close" onClick={handlePayBillClose} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={2}>
            <Typography variant="body1">
              <strong>Member Name:</strong> {paymentFormData.member_name}
            </Typography>
            <Typography variant="body1">
              <strong>Member ID:</strong> {paymentFormData.member_id}
            </Typography>
            <Typography variant="body1">
              <strong>Pending Amount:</strong> ₹{parseFloat(paymentFormData.pending_amount).toLocaleString()}
            </Typography>
            
            <TextField
              label="Payment Date*"
              type="date"
              fullWidth
              InputLabelProps={{ shrink: true }}
              name="bill_date"
              value={paymentFormData.bill_date}
              onChange={handlePaymentFormChange}
              margin="normal"
            />
            
            <TextField
              label="Amount to Pay*"
              fullWidth
              name="payment_amount"
              value={paymentFormData.payment_amount}
              onChange={handlePaymentFormChange}
              type="number"
              inputProps={{ min: 0, max: pendingAmount }}
              helperText={`Remaining after payment: ₹${remainingAfterPayment.toLocaleString()}`}
              margin="normal"
            />
            
            <FormControl fullWidth margin="normal">
              <InputLabel>Payment Mode*</InputLabel>
              <Select 
                value={paymentFormData.payment_mode} 
                onChange={handlePaymentModeChange}
                label="Payment Mode*"
              >
                <MenuItem value="">Select Payment Mode</MenuItem>
                <MenuItem value="Cash">Cash</MenuItem>
                <MenuItem value="Card">Card</MenuItem>
                <MenuItem value="UPI">UPI</MenuItem>
                <MenuItem value="Gpay">GPay</MenuItem>
                <MenuItem value="Paytm">Paytm</MenuItem>
                <MenuItem value="PhonePe">PhonePe</MenuItem>
                <MenuItem value="Netbanking">Net Banking</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handlePayBillClose}>Cancel</Button>
          <Button 
            onClick={handlePayBillSubmit} 
            color="primary" 
            variant="contained"
            disabled={submitting || paymentAmount <= 0 || !paymentFormData.payment_mode}
            startIcon={submitting ? <CircularProgress size={20} /> : null}
          >
            Process Payment
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default FeePending;