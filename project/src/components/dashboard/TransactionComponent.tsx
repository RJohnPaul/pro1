/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Table,
  TableBody,
  Paper,
  TableCell,
  TextField,
  TableContainer,
  TableHead,
  TableRow,
  Menu,
  TableSortLabel,
  MenuItem,
  Button,
  TablePagination,
  Card,
  CardContent,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Divider,
  FormControl,
  InputLabel,
  Select,
  SelectChangeEvent
} from "@mui/material";
import { ReactNode } from 'react';
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import WarningIcon from '@mui/icons-material/Warning';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DeleteIcon from '@mui/icons-material/Delete';
import PaymentIcon from '@mui/icons-material/Payment';
import EditIcon from '@mui/icons-material/Edit';
import { createClient } from "@supabase/supabase-js";
import { ToastContainer, toast } from "react-toastify";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import "react-toastify/dist/ReactToastify.css";
import SearchIcon from '@mui/icons-material/Search';
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseAnonKey) throw new Error("Missing Supabase URL or anon key");
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface Transaction {
  sno: number;
  bill_date: string;
  start_date: string;
  emp_id: string;
  member_name: string;
  month_paid: string;
  pending: string;
  discount: string;
  state: string;
  total_amount_received: string;
  payment_mode: string;
  renewal_date: string;
  total_paid: string;
}

interface MemberDetails {
  member_id: string;
  member_name: string;
  member_phone_number: string;
  member_email: string;
  gender: string;
  dob: string;
  member_joining_date: string;
  member_address: string;
  member_type: string;
  identity_document_type: string;
  document_id_number: string;
  blood_group?: string;
  weight?: string;
  height?: string;
  trainer?: string;
}

interface MetricsRecord {
  collected_month: string;
  collected_today: string;
  trans_done: string;
  last_updated?: string;
}

// Simple date formatter
const formatDate = (dateString: string) => {
  if (!dateString) return "";
  try {
    const [year, month, day] = dateString.split('-');
    return `${day}-${month}-${year}`;
  } catch {
    return dateString;
  }
};

const TransactionComponent = () => {
  const navigate = useNavigate();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filtered, setFiltered] = useState<Transaction[]>([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [amountCollected, setAmountCollected] = useState(0);
  const [amountPending, setAmountPending] = useState(0);
  const [collectedToday, setCollectedToday] = useState(0);
  const [transactionCount, setTransactionCount] = useState(0);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [order, setOrder] = useState<"asc" | "desc">("asc");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderBy, setOrderBy] = useState<keyof Transaction>("sno");
  const [loading, setLoading] = useState(true);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [memberDetailsOpen, setMemberDetailsOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<MemberDetails | null>(null);
  const [loadingMember, setLoadingMember] = useState(false);
  const [editedTransaction, setEditedTransaction] = useState<Transaction | null>(null);

  // Added for sorting by SNO:
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Load transactions and metrics on component mount
  useEffect(() => {
    fetchTransactions();
    fetchMetrics();
  }, []);

  // Update filtered transactions whenever transactions or search query changes
  useEffect(() => {
    filterAndSortTransactions();
  }, [transactions, searchQuery, sortDirection]);

  // Check if current date is a new day or month compared to the last update
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

  // Create a metrics record if one doesn't exist
  const createStatCardRecord = async (): Promise<MetricsRecord | null> => {
    try {
      console.log("Creating new metrics record in stat_card");
      
      const today = new Date().toISOString();
      
      // First, ensure the table exists
      try {
        await supabase.rpc('execute_sql', {
          sql: `
            CREATE TABLE IF NOT EXISTS stat_card (
              sno INTEGER PRIMARY KEY,
              collected_month TEXT,
              collected_today TEXT,
              trans_done TEXT,
              last_updated TEXT
            )
          `
        });
      } catch (error) {
        console.log("Table creation error or already exists:", error);
      }
      
      // Calculate initial amounts from existing transactions
      let collectedToday = 0;
      let collectedMonth = 0;
      let transactionCount = 0;
      
      // Get today's transactions
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      
      const { data: todayData } = await supabase
        .from("transactions")
        .select("total_paid")
        .gte("bill_date", startOfToday.toISOString());
      
      if (todayData) {
        collectedToday = todayData.reduce((sum, t) => {
          const paidAmount = parseFloat(t.total_paid || "0");
          return sum + (isNaN(paidAmount) ? 0 : paidAmount);
        }, 0);
        transactionCount = todayData.length;
      }
      
      // Get current month's transactions
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();
      
      const { data: monthData } = await supabase
        .from("transactions")
        .select("total_paid")
        .like("bill_date", `${currentYear}-${String(currentMonth).padStart(2, '0')}%`);
      
      if (monthData) {
        collectedMonth = monthData.reduce((sum, t) => {
          const paidAmount = parseFloat(t.total_paid || "0");
          return sum + (isNaN(paidAmount) ? 0 : paidAmount);
        }, 0);
      }
      
      console.log(`Initializing stat_card with calculated values: month=${collectedMonth}, today=${collectedToday}, transactions=${transactionCount}`);
      
      // Insert the record
      const { error } = await supabase
        .from("stat_card")
        .insert({
          sno: 1,
          collected_month: collectedMonth.toString(),
          collected_today: collectedToday.toString(),
          trans_done: transactionCount.toString(),
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
        collected_month: collectedMonth.toString(),
        collected_today: collectedToday.toString(),
        trans_done: transactionCount.toString(),
        last_updated: today
      };
    } catch (err) {
      console.error("Error in createStatCardRecord:", err);
      return null;
    }
  };

  // Initialize or reset metrics record based on date
  const resetMetricsIfNeeded = async (metrics: MetricsRecord): Promise<MetricsRecord> => {
    try {
      const { isNewDay, isNewMonth } = checkForDateChange(metrics.last_updated ?? null);
      const today = new Date().toISOString();
      const updatedMetrics = { ...metrics };
      
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

  // Fetch metrics for stat cards
  const fetchMetrics = async () => {
    try {
      // First try to create the stat_card table if it doesn't exist
      try {
        await supabase.rpc('create_stat_card_table_if_not_exists');
      } catch (e) {
        console.log("Table might already exist or error:", e);
      }

      // Get metrics from stat_card table
      const { data, error } = await supabase
        .from("stat_card")
        .select("*")
        .eq("sno", 1)
        .maybeSingle();
        
      if (error) {
        console.error("Error fetching metrics:", error);
        
        // Create record if doesn't exist
        if (error.code === 'PGRST116') {
          const newMetrics = await createStatCardRecord();
          if (newMetrics) {
            setAmountCollected(parseFloat(newMetrics.collected_month));
            setCollectedToday(parseFloat(newMetrics.collected_today));
            setTransactionCount(parseInt(newMetrics.trans_done));
          }
        }
        return;
      }
      
      if (data) {
        // Check for date changes and reset if needed
        const updatedMetrics = await resetMetricsIfNeeded(data as MetricsRecord);
        
        // Update state with fetched or reset values
        setAmountCollected(parseFloat(updatedMetrics.collected_month || "0"));
        setCollectedToday(parseFloat(updatedMetrics.collected_today || "0"));
        setTransactionCount(parseInt(updatedMetrics.trans_done || "0"));
      } else {
        // No record, create one
        const newMetrics = await createStatCardRecord();
        if (newMetrics) {
          setAmountCollected(parseFloat(newMetrics.collected_month));
          setCollectedToday(parseFloat(newMetrics.collected_today));
          setTransactionCount(parseInt(newMetrics.trans_done));
        }
      }
    } catch (err) {
      console.error("Error in fetchMetrics:", err);
    }
  };

  // Fetch member details by member_id
  const fetchMemberDetails = async (memberId: string) => {
    setLoadingMember(true);
    try {
      // First try to find by exact match on member_id
      // eslint-disable-next-line prefer-const
      let { data: memberData, error: memberError } = await supabase
        .from("members")
        .select("*")
        .eq("member_id", memberId)
        .maybeSingle();

      if (memberError) throw memberError;

      // If not found by member_id, try finding by string comparison
      if (!memberData) {
        const { data: allMembers, error: allMembersError } = await supabase
          .from("members")
          .select("*");
          
        if (allMembersError) throw allMembersError;
        
        // Try to find a member with a matching ID (case insensitive)
        memberData = allMembers?.find(
          m => m.member_id?.toString().toLowerCase() === memberId?.toString().toLowerCase()
        ) || null;
      }

      if (memberData) {
        setSelectedMember(memberData as MemberDetails);
        setMemberDetailsOpen(true);
      } else {
        toast.warning(`No member found with ID: ${memberId}`);
      }
    } catch (error) {
      console.error("Error fetching member details:", error);
      toast.error("Failed to fetch member details");
    } finally {
      setLoadingMember(false);
    }
  };

  // Fetch transactions with pagination
  const fetchTransactions = async () => {
    setLoading(true);
    try {
      let all: Transaction[] = [];
      let from = 0;
      const step = 1000;
      let to = step - 1;
      let fetchMore = true;

      // Fetch pending total separately
      let pendingTotal = 0;

      while (fetchMore) {
        const { data, error } = await supabase
          .from("transactions")
          .select("*")
          .not("emp_id", "eq", "METRICS") // Skip any metrics records
          .range(from, to);

        if (error) {
          toast.error("Failed to fetch transactions: " + error.message);
          fetchMore = false;
        } else {
          if (data && data.length > 0) {
            all = [...all, ...data];
            
            // Calculate pending amount
            data.forEach(t => {
              const pendingAmount = parseFloat(t.pending || "0");
              if (!isNaN(pendingAmount)) {
                pendingTotal += pendingAmount;
              }
            });
            
            from += step;
            to += step;
          } else {
            fetchMore = false;
          }
        }
      }
      
      // Set pending amount in state
      setAmountPending(pendingTotal);
      setTransactions(all);
    } catch (error) {
      const errorMessage = (error as Error).message;
      toast.error("Error fetching transactions: " + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortTransactions = () => {
    // Filter by search query
    const result = transactions.filter(
      (t) =>
        t.member_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.emp_id?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Sort by sno
    if (sortDirection === "asc") {
      result.sort((a, b) => a.sno - b.sno);
    } else {
      result.sort((a, b) => b.sno - a.sno);
    }

    setFiltered(result);
  };

  const handleClick = (e: React.MouseEvent<HTMLElement>, t: Transaction) => {
    setAnchorEl(e.currentTarget);
    setSelectedTransaction(t);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleDeleteClick = () => {
    setDeleteConfirmOpen(true);
    setAnchorEl(null);
  };

  const handleViewMember = () => {
    if (!selectedTransaction) return;
    fetchMemberDetails(selectedTransaction.emp_id);
    handleClose();
  };

  const handleEditClick = () => {
    if (!selectedTransaction) return;
    setEditedTransaction({...selectedTransaction});
    setEditDialogOpen(true);
    setAnchorEl(null);
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditedTransaction(prev => prev ? { ...prev, [name]: value } : null);
  };

  const handleEditSelectChange = (e: SelectChangeEvent) => {
    const { name, value } = e.target;
    setEditedTransaction(prev => prev ? { ...prev, [name]: value } : null);
  };

  const handleEditSubmit = async () => {
    if (!editedTransaction) return;
    
    try {
      setIsSubmitting(true);
      
      // Calculate new state based on pending amount
      const pendingAmount = parseFloat(editedTransaction.pending || "0");
      const totalAmount = parseFloat(editedTransaction.total_amount_received || "0");
      const newState = pendingAmount > 0 ? 
        (pendingAmount < totalAmount ? "Partially Paid" : "Pending") : 
        "Paid";

      const { error } = await supabase
        .from("transactions")
        .update({
          bill_date: editedTransaction.bill_date,
          start_date: editedTransaction.start_date,
          member_name: editedTransaction.member_name,
          month_paid: editedTransaction.month_paid,
          pending: editedTransaction.pending,
          discount: editedTransaction.discount,
          payment_mode: editedTransaction.payment_mode,
          state: newState,
          total_amount_received: editedTransaction.total_amount_received,
          renewal_date: editedTransaction.renewal_date,
          total_paid: editedTransaction.total_paid,
        })
        .eq("sno", editedTransaction.sno);

      if (error) throw error;
      
      toast.success("Transaction updated successfully!");
      setEditDialogOpen(false);
      fetchTransactions(); // Refresh transaction list
    } catch (error) {
      const errorMessage = (error as Error).message;
      toast.error("Error updating transaction: " + errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedTransaction) return;
    
    try {
      setIsSubmitting(true);
      const { error } = await supabase
        .from("transactions")
        .delete()
        .eq("sno", selectedTransaction.sno);
      
      if (error) throw error;
      
      toast.success("Transaction deleted successfully!");
      await fetchTransactions();
      await fetchMetrics();
    } catch (err) {
      toast.error("Failed to delete transaction");
    } finally {
      setIsSubmitting(false);
      setDeleteConfirmOpen(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmOpen(false);
  };

  const handleBill = () => {
    if (!selectedTransaction) {
      toast.error("No transaction selected");
      return;
    }
    
    navigate(`/pendingbill/${selectedTransaction.emp_id}/${selectedTransaction.sno}`);
    handleClose();
  };

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(transactions);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Transactions");
    const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([buf], { type: "application/octet-stream" }), "transactions.xlsx");
    toast.success("Transactions exported!");
  };

  const handleChangePage = (_: unknown, newPage: number) => setPage(newPage);

  const handleChangeRowsPerPage = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(+e.target.value);
    setPage(0);
  };

  const paginated = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  
  const handleSort = (property: keyof Transaction) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  const sortedData = [...paginated].sort((a, b) => {
    // Handle numeric sorting for sno
    if (orderBy === "sno") {
      return order === "asc" ? a.sno - b.sno : b.sno - a.sno;
    }

    // Handle date sorting
    if (["bill_date", "start_date", "renewal_date"].includes(orderBy)) {
      const dateA = new Date(a[orderBy] || "");
      const dateB = new Date(b[orderBy] || "");
      return order === "asc"
        ? dateA.getTime() - dateB.getTime()
        : dateB.getTime() - dateA.getTime();
    }

    // Handle numeric string sorting
    if (["pending", "discount", "total_amount_received"].includes(orderBy)) {
      const numA = parseFloat(String(a[orderBy]) || "0");
      const numB = parseFloat(String(b[orderBy]) || "0");
      return order === "asc" ? numA - numB : numB - numA;
    }

    // Handle string sorting
    const valueA = String(a[orderBy] || "").toLowerCase();
    const valueB = String(b[orderBy] || "").toLowerCase();
    return order === "asc"
      ? valueA.localeCompare(valueB)
      : valueB.localeCompare(valueA);
  });

  // Custom pagination component
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

  return (
    <Box p={4}>
      <ToastContainer />
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="textSecondary">
                Collected This Month
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: "bold" }}>
                ₹{amountCollected.toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="textSecondary">
                Total Pending
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: "bold" }}>
                ₹{amountPending.toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="textSecondary">
                Collected Today
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: "bold" }}>
                ₹{collectedToday.toLocaleString()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="textSecondary">
                Transactions Today
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: "bold" }}>
                {transactionCount}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Box display="flex" alignItems="center" gap={2}>
          <Box sx={{ position: 'relative', width: "300px" }}>
            <TextField
              placeholder="Search Transactions"
              variant="outlined"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              fullWidth
              InputProps={{
                startAdornment: (
                  <SearchIcon sx={{ color: 'action.active', mr: 1 }} />
                ),
              }}
            />
          </Box>
          <TablePagination
            rowsPerPageOptions={[10, 25, 50, 60, 100]}
            component="div"
            count={filtered.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            sx={{ border: 'none', '.MuiTablePagination-toolbar': { pl: 0 } }}
          />
        </Box>
        <Button
          variant="contained"
          color="primary"
          onClick={handleExport}
          sx={{ backgroundColor: "#2485bd", color: "#fff" }}
        >
          Export Data
        </Button>
      </Box>
      
      <Box sx={{ overflowX: "auto", maxWidth: "90vw" }}>
        <TableContainer component={Paper}>
          <Table>
            <TableHead sx={{ position: "sticky", top: 0, zIndex: 1, whiteSpace: "nowrap" }}>
              <TableRow>
                {[
                  { id: "sno", label: "SNO" },
                  { id: "bill_date", label: "BILL DATE" },
                  { id: "emp_id", label: "MEMBER ID" },
                  { id: "member_name", label: "MEMBER NAME" },
                  { id: "month_paid", label: "MONTH PAID" },
                  { id: "pending", label: "PENDING" },
                  { id: "discount", label: "DISCOUNT" },
                  { id: "state", label: "STATE" },
                  { id: "total_amount_received", label: "TOTAL" },
                  { id: "payment_mode", label: "PAYMENT MODE" },
                  { id: "start_date", label: "START DATE" },
                  { id: "renewal_date", label: "RENEWAL DATE" }
                ].map((column) => (
                  <TableCell
                    key={column.id}
                    sx={{
                      backgroundColor: "#F7EEF9",
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    <TableSortLabel
                      active={orderBy === column.id}
                      direction={orderBy === column.id ? order : 'asc'}
                      onClick={() => handleSort(column.id as keyof Transaction)}
                      sx={{
                        '&.MuiTableSortLabel-active': {
                          color: '#71045F',
                        },
                        '&.MuiTableSortLabel-active .MuiTableSortLabel-icon': {
                          color: '#71045F',
                        },
                      }}
                    >
                      {column.label}
                    </TableSortLabel>
                  </TableCell>
                ))}
                <TableCell sx={{ backgroundColor: "#F7EEF9", fontWeight: 700 }}>
                  ACTIONS
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={13} align="center" sx={{ py: 5 }}>
                    <CircularProgress size={40} />
                    <Typography variant="body1" sx={{ mt: 2 }}>
                      Loading transactions...
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : sortedData.length ? (
                sortedData.map((t) => (
                  <TableRow key={t.sno}>
                    <TableCell>{t.sno}</TableCell>
                    <TableCell>{formatDate(t.bill_date)}</TableCell>
                    <TableCell>{t.emp_id}</TableCell>
                    <TableCell>{t.member_name}</TableCell>
                    <TableCell>{t.month_paid}</TableCell>
                    <TableCell>{t.pending}</TableCell>
                    <TableCell>{t.discount}</TableCell>
                    <TableCell>{t.state}</TableCell>
                    <TableCell>{t.total_amount_received}</TableCell>
                    <TableCell>{t.payment_mode}</TableCell>
                    <TableCell>{formatDate(t.start_date)}</TableCell>
                    <TableCell>{formatDate(t.renewal_date)}</TableCell>
                    <TableCell>
                      <Button variant="contained" onClick={(e) => handleClick(e, t)} endIcon={<ArrowDropDownIcon />}>
                        Actions
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={13} align="center">
                    No transactions found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleClose}>
        <MenuItem onClick={handleViewMember} sx={{ color: '#2485bd' }}>
          <VisibilityIcon fontSize="small" sx={{ mr: 1 }} />
          View Member Details
        </MenuItem>
        <MenuItem onClick={handleEditClick} sx={{ color: '#4caf50' }}>
          <EditIcon fontSize="small" sx={{ mr: 1 }} />
          Edit Transaction
        </MenuItem>
        <MenuItem onClick={handleBill} sx={{ color: '#2196f3' }}>
          <PaymentIcon fontSize="small" sx={{ mr: 1 }} />
          Pay Bill
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleDeleteClick} sx={{ color: '#f44336' }}>
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>
      
      {/* Edit Transaction Dialog */}
      <Dialog 
        open={editDialogOpen} 
        onClose={() => setEditDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 1,
          borderBottom: '1px solid #e0e0e0',
          pb: 2
        }}>
          <EditIcon sx={{ color: '#4caf50' }} />
          Edit Transaction #{editedTransaction?.sno}
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          {editedTransaction && (
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Member Name"
                  name="member_name"
                  value={editedTransaction.member_name || ""}
                  onChange={handleEditChange}
                  fullWidth
                  margin="normal"
                />
                
                <TextField
                  label="Member ID"
                  name="emp_id"
                  value={editedTransaction.emp_id || ""}
                  onChange={handleEditChange}
                  fullWidth
                  margin="normal"
                  disabled
                />
                
                <TextField
                  label="Bill Date"
                  name="bill_date"
                  type="date"
                  value={editedTransaction.bill_date || ""}
                  onChange={handleEditChange}
                  fullWidth
                  margin="normal"
                  InputLabelProps={{ shrink: true }}
                />
                
                <TextField
                  label="Start Date"
                  name="start_date"
                  type="date"
                  value={editedTransaction.start_date || ""}
                  onChange={handleEditChange}
                  fullWidth
                  margin="normal"
                  InputLabelProps={{ shrink: true }}
                />
                
                <TextField
                  label="Renewal Date"
                  name="renewal_date"
                  type="date"
                  value={editedTransaction.renewal_date || ""}
                  onChange={handleEditChange}
                  fullWidth
                  margin="normal"
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <FormControl fullWidth margin="normal">
                  <InputLabel>Payment Mode</InputLabel>
                  <Select
                    name="payment_mode"
                    value={editedTransaction.payment_mode || ""}
                    onChange={handleEditSelectChange}
                    label="Payment Mode"
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
                
                <TextField
                  label="Month Paid"
                  name="month_paid"
                  value={editedTransaction.month_paid || ""}
                  onChange={handleEditChange}
                  fullWidth
                  margin="normal"
                  type="number"
                />
                
                <TextField
                  label="Total Amount"
                  name="total_amount_received"
                  value={editedTransaction.total_amount_received || ""}
                  onChange={handleEditChange}
                  fullWidth
                  margin="normal"
                  type="number"
                />
                
                <TextField
                  label="Total Paid"
                  name="total_paid"
                  value={editedTransaction.total_paid || ""}
                  onChange={handleEditChange}
                  fullWidth
                  margin="normal"
                  type="number"
                />
                
                <TextField
                  label="Pending Amount"
                  name="pending"
                  value={editedTransaction.pending || ""}
                  onChange={handleEditChange}
                  fullWidth
                  margin="normal"
                  type="number"
                />
                
                <TextField
                  label="Discount"
                  name="discount"
                  value={editedTransaction.discount || ""}
                  onChange={handleEditChange}
                  fullWidth
                  margin="normal"
                  type="number"
                />
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: '1px solid #e0e0e0' }}>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleEditSubmit} 
            variant="contained" 
            color="primary"
            disabled={isSubmitting}
            startIcon={isSubmitting ? <CircularProgress size={20} /> : null}
          >
            {isSubmitting ? "Saving..." : "Save Changes"}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog 
        open={deleteConfirmOpen} 
        onClose={handleDeleteCancel}
        PaperProps={{
          sx: {
            width: '400px',
            padding: '16px'
          }
        }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningIcon sx={{ color: 'warning.main' }} />
          Confirm Deletion
        </DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this transaction? This action cannot be undone.
          </Typography>
          {selectedTransaction && (
            <Box mt={2} p={2} bgcolor="#f8f8f8" borderRadius={1}>
              <Typography><strong>Member:</strong> {selectedTransaction.member_name}</Typography>
              <Typography><strong>Member ID:</strong> {selectedTransaction.emp_id}</Typography>
              <Typography><strong>Amount:</strong> ₹{parseFloat(selectedTransaction.total_amount_received || "0").toLocaleString()}</Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel}>Cancel</Button>
          <Button 
            onClick={handleDeleteConfirm} 
            color="error" 
            variant="contained"
            disabled={isSubmitting}
            startIcon={isSubmitting ? <CircularProgress size={20} /> : null}
          >
            {isSubmitting ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Member Details Dialog */}
      <Dialog
        open={memberDetailsOpen}
        onClose={() => setMemberDetailsOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            p: 2
          }
        }}
      >
        <DialogTitle sx={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid #e0e0e0',
          pb: 2
        }}>
          <Typography variant="h6" component="div" sx={{ display: 'flex', alignItems: 'center' }}>
            <VisibilityIcon sx={{ mr: 1, color: '#2485bd' }} />
            Member Details
          </Typography>
          <Button onClick={() => setMemberDetailsOpen(false)} color="inherit" size="small">
            Close
          </Button>
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          {loadingMember ? (
            <Box display="flex" justifyContent="center" alignItems="center" py={4}>
              <CircularProgress />
            </Box>
          ) : selectedMember ? (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Box mb={3}>
                  <Typography variant="h6" color="primary" gutterBottom>
                    Personal Information
                  </Typography>
                  <Box sx={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                    gap: 2,
                    bgcolor: '#f9f9f9',
                    p: 2,
                    borderRadius: 1
                  }}>
                    <Typography><strong>Name:</strong> {selectedMember.member_name}</Typography>
                    <Typography><strong>Member ID:</strong> {selectedMember.member_id}</Typography>
                    <Typography><strong>Phone:</strong> {selectedMember.member_phone_number}</Typography>
                    <Typography><strong>Email:</strong> {selectedMember.member_email || 'N/A'}</Typography>
                    <Typography><strong>Gender:</strong> {selectedMember.gender || 'N/A'}</Typography>
                    <Typography><strong>DOB:</strong> {formatDate(selectedMember.dob) || 'N/A'}</Typography>
                  </Box>
                </Box>

                <Box mb={3}>
                  <Typography variant="h6" color="primary" gutterBottom>
                    Address & Identity
                  </Typography>
                  <Box sx={{ 
                    bgcolor: '#f9f9f9',
                    p: 2,
                    borderRadius: 1
                  }}>
                    <Typography sx={{ mb: 1 }}><strong>Address:</strong></Typography>
                    <Typography sx={{ mb: 1, whiteSpace: 'pre-wrap' }}>
                      {selectedMember.member_address || 'N/A'}
                    </Typography>
                    <Divider sx={{ my: 1 }} />
                    <Typography sx={{ mt: 1 }}>
                      <strong>ID Type:</strong> {selectedMember.identity_document_type || 'N/A'}
                    </Typography>
                    <Typography>
                      <strong>ID Number:</strong> {selectedMember.document_id_number || 'N/A'}
                    </Typography>
                  </Box>
                </Box>
              </Grid>

              <Grid item xs={12} md={6}>
                <Box mb={3}>
                  <Typography variant="h6" color="primary" gutterBottom>
                    Membership Details
                  </Typography>
                  <Box sx={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                    gap: 2,
                    bgcolor: '#f9f9f9',
                    p: 2,
                    borderRadius: 1
                  }}>
                    <Typography><strong>Membership Type:</strong> {selectedMember.member_type || 'N/A'}</Typography>
                    <Typography><strong>Joined On:</strong> {formatDate(selectedMember.member_joining_date) || 'N/A'}</Typography>
                    <Typography><strong>Trainer:</strong> {selectedMember.trainer || 'N/A'}</Typography>
                  </Box>
                </Box>

                <Box>
                  <Button 
                    variant="contained" 
                    color="primary" 
                    onClick={() => {
                      setMemberDetailsOpen(false);
                      if (selectedTransaction) {
                        handleBill();
                      }
                    }}
                    startIcon={<PaymentIcon />}
                    fullWidth
                    sx={{ mt: 2 }}
                  >
                    Process Payment
                  </Button>
                </Box>
              </Grid>
            </Grid>
          ) : (
            <Box sx={{ py: 4, textAlign: 'center' }}>
              <Typography variant="h6">No member details found</Typography>
            </Box>
          )}
        </DialogContent>
      </Dialog>
      
      <TablePagination
        rowsPerPageOptions={[10, 25, 50, 60, 100]}
        component="div"
        count={filtered.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        ActionsComponent={TablePaginationActions}
      />
    </Box>
  );
};

export default TransactionComponent;