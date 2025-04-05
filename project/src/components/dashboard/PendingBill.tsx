/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  CircularProgress,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  List,
  ListItem,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Alert,
  Card,
  CardContent,
} from "@mui/material";
import { SelectChangeEvent } from "@mui/material/Select";
import { useParams, useNavigate } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface FormData {
  sno: number;
  bill_date: string;
  start_date: string;
  member_name: string;
  month_paid: string;
  discount: string;
  pending: string;
  payment_mode: string;
  state: string;
  emp_id: string;
  renewal_date: string;
  totalAmount: string;
  tax: string;
  memberPack: string;
  billingAmount: string;
  packAmount: string;
  totalMonthPaid: string;
  paymentAmount: string;
  total_paid: string;
}

interface MemberDetails {
  member_id: string;
  member_name: string;
  member_phone_number: string;
  member_email: string;
  gender: string;
  member_type: string;
}

interface MetricsRecord {
  collected_month: string;
  collected_today: string;
  trans_done: string;
  last_updated?: string;
}

const PendingBill: React.FC = () => {
  const { emp_id, sno } = useParams<{ emp_id: string; sno: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [openSelect, setOpenSelect] = useState(false);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [metricsRecord, setMetricsRecord] = useState<MetricsRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [memberDetails, setMemberDetails] = useState<MemberDetails | null>(null);

  const [formData, setFormData] = useState<FormData>({
    sno: 0,
    bill_date: new Date().toISOString().split('T')[0],
    start_date: "",
    member_name: "",
    month_paid: "",
    discount: "",
    pending: "",
    payment_mode: "",
    state: "",
    emp_id: "",
    renewal_date: "",
    totalAmount: "0",
    tax: "0",
    memberPack: "",
    billingAmount: "0",
    packAmount: "0",
    totalMonthPaid: "0",
    paymentAmount: "0",
    total_paid: "0",
  });

  // Load transaction data and metrics when component mounts
  useEffect(() => {
    if (emp_id && sno) {
      fetchMetricsRecord();
      fetchTransactionDetails();
    }
  }, [emp_id, sno]);

  // Ensure payment amount doesn't exceed pending amount
  useEffect(() => {
    const pendingAmount = parseFloat(formData.pending || "0");
    const paymentAmount = parseFloat(formData.paymentAmount || "0");
    
    if (paymentAmount > pendingAmount) {
      setFormData(prev => ({
        ...prev,
        paymentAmount: pendingAmount.toString()
      }));
    }
  }, [formData.paymentAmount, formData.pending]);

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
  const createMetricsRecord = async (): Promise<MetricsRecord | null> => {
    try {
      console.log("Creating new metrics record");
      
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
      // eslint-disable-next-line prefer-const
      let updatedMetrics = { ...metrics };
      
      if (isNewDay || isNewMonth) {
        // Reset values based on date change
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

  // Fetch the metrics record
  const fetchMetricsRecord = async () => {
    try {
      // First check if metrics record exists
      const { data, error } = await supabase
        .from("stat_card")
        .select("*")
        .eq("sno", 1)
        .maybeSingle();

      if (error) {
        if (error.code === 'PGRST116') {
          // Table might not exist, create it
          try {
            await supabase.rpc('create_stat_card_table_if_not_exists');
            const newMetrics = await createMetricsRecord();
            if (newMetrics) {
              setMetricsRecord(newMetrics);
            }
          } catch (tableErr) {
            console.error("Error creating stat_card table:", tableErr);
          }
        } else {
          console.error("Error fetching metrics:", error);
        }
        return;
      }
      
      if (data) {
        // Check if we need to reset values for a new day/month
        const updatedMetrics = await resetMetricsIfNeeded(data as MetricsRecord);
        setMetricsRecord(updatedMetrics);
      } else {
        // No record found, create one
        const newMetrics = await createMetricsRecord();
        if (newMetrics) {
          setMetricsRecord(newMetrics);
        }
      }
    } catch (err) {
      console.error("Error in fetchMetricsRecord:", err);
    }
  };

  // Update the metrics when a payment is processed
  const updateMetricsRecord = async (paymentAmount: number): Promise<boolean> => {
    try {
      console.log(`Processing payment metrics update: amount = ${paymentAmount}`);
      
      // First, ensure the table exists using direct SQL
      try {
        console.log("Table already exists, skipping creation.");
      } catch (error) {
        console.log("Table creation error or already exists:", error);
      }

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
      
      // Update local state for immediate UI reflection
      setMetricsRecord({
        collected_month: newCollectedMonth.toString(),
        collected_today: newCollectedToday.toString(),
        trans_done: newTransactionsDone.toString(),
        last_updated: new Date().toISOString()
      });
      
      return true;
    } catch (err) {
      console.error("Error in updateMetricsRecord:", err);
      return false;
    }
  };

  // Fetch member details
  const fetchMemberDetails = async (memberId: string, memberName: string) => {
    try {
      // First try to find by exact match on member_id
      // eslint-disable-next-line prefer-const
      let { data, error } = await supabase
        .from("members")
        .select("member_id, member_name, member_phone_number, member_email, gender, member_type")
        .eq("member_id", memberId)
        .maybeSingle();
      
      // If not found by ID, try by name as a fallback
      if (!data && memberName) {
        const { data: nameData, error: nameError } = await supabase
          .from("members")
          .select("member_id, member_name, member_phone_number, member_email, gender, member_type")
          .eq("member_name", memberName)
          .maybeSingle();
        
        if (nameError) throw nameError;
        data = nameData;
      }

      // If we found member details, save them
      if (data) {
        setMemberDetails(data);
      }
    } catch (err) {
      console.error("Error fetching member details:", err);
    }
  };

  const fetchTransactionDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!sno) {
        throw new Error("Missing transaction ID");
      }

      // First try with both emp_id and sno if both are provided
      let transactionData: {
        emp_id: string;
        member_name: string;
        total_paid: string;
        [key: string]: any;
      } | null = null;
      
      if (emp_id) {
        const { data, error } = await supabase
          .from("transactions")
          .select("*")
          .eq("emp_id", emp_id)
          .eq("sno", sno)
          .maybeSingle();
        
        if (!error && data) {
          transactionData = data;
        }
      }

      // If that didn't work, try just by sno
      if (!transactionData) {
        const { data, error } = await supabase
          .from("transactions")
          .select("*")
          .eq("sno", sno)
          .maybeSingle();
        
        if (error) throw error;
        
        if (!data) {
          throw new Error("No transaction found with ID: " + sno);
        }
        
        transactionData = data;
      }

      // If we found the transaction, load it
      await loadTransactionData(transactionData);
      
      // Also fetch the member details for extra info
      if (transactionData) {
        await fetchMemberDetails(transactionData.emp_id, transactionData.member_name);
      }
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error occurred";
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const loadTransactionData = async (transaction: any) => {
    try {
      // Get additional member data if needed
      const { data: memberData, error: memberError } = await supabase
        .from("members")
        .select("member_type")
        .eq("member_id", transaction.emp_id)
        .maybeSingle();
      
      // If not found by member_id, try with member_name
      let memberType = "";
      if (!memberData && !memberError) {
        const { data: nameData } = await supabase
          .from("members")
          .select("member_type")
          .eq("member_name", transaction.member_name)
          .maybeSingle();
        
        if (nameData) {
          memberType = nameData.member_type;
        }
      } else if (memberData) {
        memberType = memberData.member_type;
      }

      setFormData({
        sno: transaction.sno,
        bill_date: new Date().toISOString().split('T')[0], // Default to today's date
        start_date: transaction.start_date || "",
        member_name: transaction.member_name || "",
        month_paid: transaction.month_paid || "",
        discount: transaction.discount || "",
        pending: transaction.pending || "0",
        payment_mode: transaction.payment_mode || "",
        state: transaction.state || "",
        emp_id: transaction.emp_id || "",
        renewal_date: transaction.renewal_date || "",
        totalAmount: transaction.total_amount_received || "0",
        tax: "0",
        memberPack: memberType || "",
        billingAmount: "0",
        packAmount: "0",
        totalMonthPaid: "0",
        paymentAmount: transaction.pending || "0", // Default to full pending amount
        total_paid: transaction.total_paid || "0"
      });
    } catch (err) {
      console.error("Error loading transaction data:", err);
      throw err;
    }
  };

  const handleSelectTransaction = async (transaction: any) => {
    setOpenSelect(false);
    setLoading(true);
    try {
      await loadTransactionData(transaction);
      await fetchMemberDetails(transaction.emp_id, transaction.member_name);
    } catch (error) {
      toast.error("Error loading selected transaction");
    } finally {
      setLoading(false);
    }
  };

  const handleChangeMainForm = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePaymentModeChange = (e: SelectChangeEvent<string>) => {
    setFormData((prev) => ({ ...prev, payment_mode: e.target.value }));
  };

  const handleSubmit = async () => {
    if (!formData.payment_mode) {
      toast.error("Please select a payment mode");
      return;
    }

    const paymentAmount = parseFloat(formData.paymentAmount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      toast.error("Please enter a valid payment amount");
      return;
    }

    const pendingAmount = parseFloat(formData.pending);
    if (paymentAmount > pendingAmount) {
      toast.error("Payment amount cannot exceed pending amount");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      // Calculate new pending amount
      const newPendingAmount = Math.max(0, pendingAmount - paymentAmount);
      
      // Calculate new total_paid amount
      const oldTotalPaid = parseFloat(formData.total_paid || "0");
      const newTotalPaid = oldTotalPaid + paymentAmount;

      // Update the transaction record
      const { error: updateError } = await supabase
        .from("transactions")
        .update({
          bill_date: formData.bill_date,
          pending: newPendingAmount.toString(),
          payment_mode: formData.payment_mode,
          state: newPendingAmount > 0 ? "Partially Paid" : "Paid",
          total_paid: newTotalPaid.toString(),
        })
        .eq("sno", formData.sno);

      if (updateError) throw updateError;

      // Update metrics in the stat_card table
      const metricsUpdated = await updateMetricsRecord(paymentAmount);

      if (!metricsUpdated) {
        console.warn("Failed to update metrics - but proceeding with payment");
      }

      toast.success("Payment processed successfully!");
      navigate("/transactions");
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error occurred";
      setError(errorMsg);
      toast.error("Error processing payment: " + errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  // Calculate remaining amount after this payment
  const pendingAmount = parseFloat(formData.pending || "0");
  const paymentAmount = parseFloat(formData.paymentAmount || "0");
  const remainingAfterPayment = Math.max(0, pendingAmount - paymentAmount);

  // Format date for display
  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    try {
      const [year, month, day] = dateString.split('-');
      return `${day}-${month}-${year}`;
    } catch {
      return dateString;
    }
  };

  return (
    <Box p={4}>
      <ToastContainer />
      <Typography variant="h5" sx={{ textAlign: "center", fontWeight: "bold", mb: 2 }}>
        Payment Form
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {!formData.emp_id ? (
        <Box sx={{ my: 4, p: 3, textAlign: "center", border: "1px solid #e0e0e0", borderRadius: 2 }}>
          <Typography variant="h6" gutterBottom>
            No transaction found
          </Typography>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={() => navigate("/transactions")}
            sx={{ mt: 2 }}
          >
            Back to Transactions
          </Button>
        </Box>
      ) : (
        <>
          {memberDetails && (
            <Card sx={{ mb: 3, bgcolor: '#f0f7ff', border: '1px solid #bbd6f9' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom color="primary">
                  Member Information
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={4}>
                    <Typography><strong>Name:</strong> {memberDetails.member_name}</Typography>
                    <Typography><strong>ID:</strong> {memberDetails.member_id}</Typography>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Typography><strong>Phone:</strong> {memberDetails.member_phone_number || 'N/A'}</Typography>
                    <Typography><strong>Email:</strong> {memberDetails.member_email || 'N/A'}</Typography>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Typography><strong>Gender:</strong> {memberDetails.gender || 'N/A'}</Typography>
                    <Typography><strong>Membership:</strong> {memberDetails.member_type || 'N/A'}</Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          )}
        
          <Box 
            sx={{ 
              border: "1px solid #e0e0e0",
              borderRadius: 2,
              p: 3,
              mb: 4,
              backgroundColor: "#f9f9f9"
            }}
          >
            <Typography variant="h6" sx={{ mb: 2, color: "#2485bd" }}>
              Transaction Details
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography><strong>Member Name:</strong> {formData.member_name}</Typography>
                <Typography><strong>Member ID:</strong> {formData.emp_id}</Typography>
                <Typography><strong>Package:</strong> {formData.memberPack}</Typography>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography><strong>Total Amount:</strong> ₹{parseFloat(formData.totalAmount).toLocaleString()}</Typography>
                <Typography><strong>Pending Amount:</strong> ₹{parseFloat(formData.pending).toLocaleString()}</Typography>
                <Typography><strong>Total Paid So Far:</strong> ₹{parseFloat(formData.total_paid).toLocaleString()}</Typography>
                <Typography><strong>Last Payment Date:</strong> {formatDate(formData.bill_date)}</Typography>
              </Grid>
            </Grid>
          </Box>

          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" sx={{ mb: 2, color: "#2485bd" }}>
              Process Payment
            </Typography>

            <Box display="flex" flexDirection="column" gap={2}>
              <TextField
                label="Payment Date*"
                type="date"
                fullWidth
                InputLabelProps={{ shrink: true }}
                name="bill_date"
                value={formData.bill_date}
                onChange={handleChangeMainForm}
              />
              
              <TextField
                label="Amount to Pay*"
                fullWidth
                name="paymentAmount"
                value={formData.paymentAmount}
                onChange={handleChangeMainForm}
                type="number"
                inputProps={{ min: 0, max: pendingAmount }}
                helperText={`Remaining after payment: ₹${remainingAfterPayment.toLocaleString()}`}
              />
              
              <FormControl fullWidth>
                <InputLabel>Payment Mode*</InputLabel>
                <Select 
                  value={formData.payment_mode} 
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
          </Box>

          <Box display="flex" justifyContent="flex-end" gap={2}>
            <Button 
              variant="outlined" 
              onClick={() => navigate("/transactions")}
            >
              Cancel
            </Button>
            <Button 
              variant="contained" 
              color="primary" 
              onClick={handleSubmit}
              disabled={submitting || paymentAmount <= 0 || !formData.payment_mode}
              startIcon={submitting ? <CircularProgress size={20} /> : null}
            >
              Process Payment
            </Button>
          </Box>
        </>
      )}

      <Dialog open={openSelect} onClose={() => setOpenSelect(false)}>
        <DialogTitle>Select Transaction</DialogTitle>
        <DialogContent>
          <List>
            {transactions.map((transaction, index) => (
              <ListItem
                component="button"
                key={index}
                onClick={() => handleSelectTransaction(transaction)}
              >
                <ListItemText
                  primary={`${transaction.member_name} - ${transaction.emp_id}`}
                  secondary={`Amount: ₹${parseFloat(transaction.total_amount_received || "0").toLocaleString()}, Pending: ₹${parseFloat(transaction.pending || "0").toLocaleString()}`}
                />
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => navigate("/transactions")}>Cancel</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PendingBill;