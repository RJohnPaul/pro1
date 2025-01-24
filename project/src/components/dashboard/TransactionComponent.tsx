import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
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
  MenuItem,
  Button,
  TablePagination,
  Modal,
  IconButton,
} from "@mui/material";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import CloseIcon from "@mui/icons-material/Close";
import { createClient } from "@supabase/supabase-js";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase URL or anon key");
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface Transaction {
  sno?: number;
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
}

const TransactionComponent = () => {
  const { period } = useParams<{ period?: string }>();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [openModal, setOpenModal] = useState<boolean>(false);
  const [newTransaction, setNewTransaction] = useState<Transaction>({
    bill_date: "",
    start_date: "",
    emp_id: "",
    member_name: "",
    month_paid: "",
    pending: "",
    discount: "",
    state: "",
    total_amount_received: "",
    payment_mode: "",
    renewal_date: "",
  });
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>(""); // Added search query state

  useEffect(() => {
    fetchTransactions();
  }, []);

  useEffect(() => {
    filterTransactions();
  }, [period, transactions, searchQuery]); // Include searchQuery in the dependency array

  const fetchTransactions = async () => {
    const { data, error } = await supabase.from("transactions").select("*");
    if (error) {
      toast.error("Failed to fetch transactions: " + error.message);
    } else {
      setTransactions(data);
    }
  };

  const filterTransactions = () => {
    const today = new Date();
    const filtered = transactions.filter((transaction) => {
      const transactionDate = new Date(transaction.bill_date);
      const transactionYear = transactionDate.getFullYear();
      const transactionMonth = transactionDate.getMonth();
      const transactionDay = transactionDate.getDate();

      // Filter by period first (yearly, monthly, today)
      let isPeriodMatch = true;
      switch (period) {
        case "yearly":
          isPeriodMatch = transactionYear === today.getFullYear();
          break;
        case "monthly":
          isPeriodMatch = transactionYear === today.getFullYear() && transactionMonth === today.getMonth();
          break;
        case "today":
          isPeriodMatch = transactionYear === today.getFullYear() && transactionMonth === today.getMonth() && transactionDay === today.getDate();
          break;
        default:
          break;
      }

      // Filter by search query (member name or member ID)
      const isSearchMatch =
        transaction.member_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        transaction.emp_id.toLowerCase().includes(searchQuery.toLowerCase());

      return isPeriodMatch && isSearchMatch;
    });

    setFilteredTransactions(filtered);
  };

  const handleAddTransaction = async () => {
    const { error } = await supabase.from("transactions").insert([newTransaction]);
    if (error) {
      toast.error("Failed to add transaction: " + error.message);
    } else {
      toast.success("Transaction added successfully!");
      fetchTransactions();
      setOpenModal(false);
      setNewTransaction({
        bill_date: "",
        start_date: "",
        emp_id: "",
        member_name: "",
        month_paid: "",
        pending: "",
        discount: "",
        state: "",
        total_amount_received: "",
        payment_mode: "",
        renewal_date: "",
      });
    }
  };

  const handleEditTransaction = async () => {
    if (!selectedTransaction) return;
    const { error } = await supabase
      .from("transactions")
      .update(selectedTransaction)
      .eq("sno", selectedTransaction.sno);
    if (error) {
      toast.error("Failed to update transaction: " + error.message);
    } else {
      toast.success("Transaction updated successfully!");
      fetchTransactions();
      setAnchorEl(null);
      setSelectedTransaction(null);
    }
  };

  const handleDeleteTransaction = async () => {
    if (!selectedTransaction) return;
    const { error } = await supabase
      .from("transactions")
      .delete()
      .eq("sno", selectedTransaction.sno);
    if (error) {
      toast.error("Failed to delete transaction: " + error.message);
    } else {
      toast.success("Transaction deleted successfully!");
      fetchTransactions();
      setAnchorEl(null);
      setSelectedTransaction(null);
    }
  };

  const handleActionClick = (event: React.MouseEvent<HTMLElement>, transaction: Transaction) => {
    setAnchorEl(event.currentTarget);
    setSelectedTransaction(transaction);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedTransaction(null);
  };

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const paginatedTransactions = filteredTransactions.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <Box p={4}>
      <ToastContainer />

      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Button
          variant="contained"
          sx={{ backgroundColor: "#2485bd", color: "white", padding: "5px 15px" }}
          onClick={() => setOpenModal(true)}
        >
          Add Transaction
        </Button>
        <Typography
          variant="h5"
          sx={{ textAlign: "center", fontWeight: "bold", color: "#71045F", flexGrow: 1 }}
        >
          {(period || "").charAt(0).toUpperCase() + (period || "").slice(1)} Transaction Details
        </Typography>
        <TextField
          label="Search"
          variant="outlined"
          sx={{ width: "25%" }}
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
          }}
        />
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ backgroundColor: "#F7EEF9", fontWeight: '700' }}>SNO</TableCell>
              <TableCell sx={{ backgroundColor: "#F7EEF9", fontWeight: '700' }}>BILL DATE</TableCell>
              <TableCell sx={{ backgroundColor: "#F7EEF9", fontWeight: '700' }}>MEMBER ID</TableCell>
              <TableCell sx={{ backgroundColor: "#F7EEF9", fontWeight: '700' }}>MEMBER NAME</TableCell>
              <TableCell sx={{ backgroundColor: "#F7EEF9", fontWeight: '700' }}>MONTH PAID</TableCell>
              <TableCell sx={{ backgroundColor: "#F7EEF9", fontWeight: '700' }}>PENDING</TableCell>
              <TableCell sx={{ backgroundColor: "#F7EEF9", fontWeight: '700' }}>DISCOUNT</TableCell>
              <TableCell sx={{ backgroundColor: "#F7EEF9", fontWeight: '700' }}>STATE</TableCell>
              <TableCell sx={{ backgroundColor: "#F7EEF9", fontWeight: '700' }}>TOTAL AMOUNT RECEIVED</TableCell>
              <TableCell sx={{ backgroundColor: "#F7EEF9", fontWeight: '700' }}>PAYMENT MODE</TableCell>
              <TableCell sx={{ backgroundColor: "#F7EEF9", fontWeight: '700' }}>START DATE</TableCell>
              <TableCell sx={{ backgroundColor: "#F7EEF9", fontWeight: '700' }}>RENEWAL DATE</TableCell>
              <TableCell sx={{ backgroundColor: "#F7EEF9", fontWeight: '700' }}>ACTIONS</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedTransactions.length > 0 ? (
              paginatedTransactions.map((transaction, index) => (
                <TableRow key={transaction.sno}>
                  <TableCell>{page * rowsPerPage + index + 1}</TableCell>
                  <TableCell>{transaction.bill_date}</TableCell>
                  <TableCell>{transaction.emp_id}</TableCell>
                  <TableCell>{transaction.member_name}</TableCell>
                  <TableCell>{transaction.month_paid}</TableCell>
                  <TableCell>{transaction.pending}</TableCell>
                  <TableCell>{transaction.discount}</TableCell>
                  <TableCell>{transaction.state}</TableCell>
                  <TableCell>{transaction.total_amount_received}</TableCell>
                  <TableCell>{transaction.payment_mode}</TableCell>
                  <TableCell>{transaction.start_date}</TableCell>
                  <TableCell>{transaction.renewal_date}</TableCell>
                  <TableCell>
                    <Button
                      variant="contained"
                      aria-controls={anchorEl ? "actions-menu" : undefined}
                      aria-haspopup="true"
                      onClick={(e) => handleActionClick(e, transaction)}
                      endIcon={<ArrowDropDownIcon />}
                    >
                      Actions
                    </Button>
                    <Menu
                      id="actions-menu"
                      anchorEl={anchorEl}
                      open={Boolean(anchorEl) && selectedTransaction?.sno === transaction.sno}
                      onClose={handleMenuClose}
                    >
                      <MenuItem onClick={handleEditTransaction}>Edit</MenuItem>
                      <MenuItem onClick={handleDeleteTransaction}>Delete</MenuItem>
                    </Menu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={12} align="center">No transactions found</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        rowsPerPageOptions={[5, 10, 25]}
        component="div"
        count={filteredTransactions.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />

      {/* Add Transaction Modal */}
      <Modal open={openModal} onClose={() => setOpenModal(false)}>
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 400,
            bgcolor: "white",
            borderRadius: 4,
            padding: 4,
            boxShadow: 24,
          }}
        >
          <Typography variant="h6" sx={{ marginBottom: 2 }}>
            Add Transaction
          </Typography>
          <TextField
            label="Bill Date"
            variant="outlined"
            fullWidth
            sx={{ marginBottom: 2 }}
            value={newTransaction.bill_date}
            onChange={(e) => setNewTransaction({ ...newTransaction, bill_date: e.target.value })}
          />
          <TextField
            label="Member Name"
            variant="outlined"
            fullWidth
            sx={{ marginBottom: 2 }}
            value={newTransaction.member_name}
            onChange={(e) => setNewTransaction({ ...newTransaction, member_name: e.target.value })}
          />
          <TextField
            label="Total Amount Received"
            variant="outlined"
            fullWidth
            sx={{ marginBottom: 2 }}
            value={newTransaction.total_amount_received}
            onChange={(e) => setNewTransaction({ ...newTransaction, total_amount_received: e.target.value })}
          />
          <Box display="flex" justifyContent="space-between">
            <Button
              variant="contained"
              sx={{ backgroundColor: "#2485bd", color: "white" }}
              onClick={handleAddTransaction}
            >
              Add
            </Button>
            <IconButton onClick={() => setOpenModal(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>
      </Modal>
    </Box>
  );
};

export default TransactionComponent;