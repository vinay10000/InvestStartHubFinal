import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  TrendingUp, Users, Wallet, DollarSign, BarChart2, PieChart as PieChartIcon, 
  LineChart as LineChartIcon, Activity, Filter
} from "lucide-react";
import { getDatabase, ref, get, query, orderByChild } from "firebase/database";
import { Skeleton } from "@/components/ui/skeleton";
import { getTransactionsByFounderId } from "@/firebase/database";

// This will be populated with real data from Firebase

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

interface InvestmentAnalyticsProps {
  startupId?: string;
  userId?: string;
  isFounderView?: boolean;
}

const InvestmentAnalytics: React.FC<InvestmentAnalyticsProps> = ({ 
  startupId, 
  userId,
  isFounderView = false 
}) => {
  const [timeRange, setTimeRange] = useState('6months');
  const [chartType, setChartType] = useState('bar');
  const [loading, setLoading] = useState(true);
  
  // Real data from Firebase
  const [investmentData, setInvestmentData] = useState<any[]>([]);
  const [sectorData, setSectorData] = useState<any[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  
  // Load data from Firebase
  useEffect(() => {
    const fetchData = async () => {
      if (!userId) return;
      
      setLoading(true);
      try {
        // Fetch transactions based on the user's role
        let transactions: Transaction[] = [];
        
        if (isFounderView) {
          transactions = await getTransactionsByFounderId(userId);
          console.log("Fetched founder transactions for analytics:", transactions);
        } else {
          // For investor view, we'd fetch by investor ID
          // This would need to be implemented in database.ts
          const db = getDatabase();
          const transactionsRef = ref(db, 'transactions');
          const snapshot = await get(transactionsRef);
          
          if (snapshot.exists()) {
            const allTransactions = snapshot.val();
            transactions = Object.values(allTransactions)
              .filter((tx: any) => 
                tx.investorId && tx.investorId.toString() === userId.toString()
              ) as Transaction[];
            console.log("Fetched investor transactions for analytics:", transactions);
          }
        }
        
        if (transactions && transactions.length > 0) {
          // Process transaction data for charts
          processTransactions(transactions);
        } else {
          // Initialize with empty data
          setInvestmentData([]);
          setSectorData([
            { name: 'AI & ML', value: 0 },
            { name: 'FinTech', value: 0 },
            { name: 'Health Tech', value: 0 },
            { name: 'Clean Energy', value: 0 },
            { name: 'Other', value: 100 },
          ]);
          setRecentTransactions([]);
        }
      } catch (error) {
        console.error("Error fetching analytics data:", error);
        // Set default empty data
        setInvestmentData([]);
        setSectorData([
          { name: 'AI & ML', value: 0 },
          { name: 'FinTech', value: 0 },
          { name: 'Health Tech', value: 0 },
          { name: 'Clean Energy', value: 0 },
          { name: 'Other', value: 100 },
        ]);
        setRecentTransactions([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [userId, isFounderView, timeRange]);
  
  // Define a transaction interface to help with type checking
  interface Transaction {
    id?: string | number;
    startupId?: string | number;
    startupName?: string;
    investorId?: string | number;
    investorName?: string;
    amount?: string | number;
    status?: string;
    category?: string;
    stage?: string;
    equity?: string | number;
    createdAt?: string | Date;
    [key: string]: any; // Allow for other properties
  }
  
  // Process transaction data for charts
  const processTransactions = (transactions: Transaction[]) => {
    try {
      // Group transactions by month and calculate totals
      const monthlyData: Record<string, { amount: number, investors: Set<string> }> = {};
      const sectorCounts: Record<string, number> = {
        'AI & ML': 0,
        'FinTech': 0,
        'Health Tech': 0,
        'Clean Energy': 0,
        'Other': 0
      };
      
      const recentTxs = [...transactions]
        .sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        })
        .slice(0, 5);
      
      setRecentTransactions(recentTxs);
      
      transactions.forEach(tx => {
        // Skip transactions without amount or with invalid status
        if (!tx.amount || tx.status !== 'completed') return;
        
        // Get month from transaction date
        const txDate = tx.createdAt ? new Date(tx.createdAt) : new Date();
        const monthYear = `${txDate.toLocaleString('default', { month: 'short' })} ${txDate.getFullYear()}`;
        
        // Add to monthly data
        if (!monthlyData[monthYear]) {
          monthlyData[monthYear] = { 
            amount: 0, 
            investors: new Set<string>() 
          };
        }
        
        monthlyData[monthYear].amount += typeof tx.amount === 'number' ? tx.amount : parseFloat(tx.amount as string);
        
        // Add investor/startup to set to count unique ones
        if (tx.investorId) {
          monthlyData[monthYear].investors.add(tx.investorId.toString());
        }
        
        // Parse amount once
        const amountNum = typeof tx.amount === 'number' ? tx.amount : parseFloat(tx.amount as string);
        
        // Add to sector data (using transaction category or startup category)
        const category = tx.category || 'Other';
        if (category.includes('AI') || category.includes('ML')) {
          sectorCounts['AI & ML'] += amountNum;
        } else if (category.includes('Fin') || category.includes('Pay')) {
          sectorCounts['FinTech'] += amountNum;
        } else if (category.includes('Health') || category.includes('Med')) {
          sectorCounts['Health Tech'] += amountNum;
        } else if (category.includes('Energy') || category.includes('Clean') || category.includes('Green')) {
          sectorCounts['Clean Energy'] += amountNum;
        } else {
          sectorCounts['Other'] += amountNum;
        }
      });
      
      // Convert to array for charts
      const monthlyArray = Object.entries(monthlyData)
        .sort((a, b) => {
          // Sort by date
          const monthsOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          const [monthA, yearA] = a[0].split(' ');
          const [monthB, yearB] = b[0].split(' ');
          
          if (yearA !== yearB) {
            return parseInt(yearA) - parseInt(yearB);
          }
          
          return monthsOrder.indexOf(monthA) - monthsOrder.indexOf(monthB);
        })
        .map(([month, data]) => ({
          month,
          amount: parseFloat(data.amount.toFixed(2)),
          investors: data.investors.size
        }));
      
      // If no data, create some months with zero values
      if (monthlyArray.length === 0) {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
        monthlyArray.push(...months.map(month => ({
          month,
          amount: 0,
          investors: 0
        })));
      }
      
      setInvestmentData(monthlyArray);
      
      // Convert sector data to array for pie chart
      const totalAmount = Object.values(sectorCounts).reduce((sum, amount) => sum + amount, 0);
      const sectorArray = Object.entries(sectorCounts)
        .map(([name, amount]) => ({
          name,
          value: totalAmount ? Math.round((amount / totalAmount) * 100) : 0
        }));
      
      // Ensure we always have at least "Other: 100%" if no data
      if (totalAmount === 0) {
        sectorArray.find(s => s.name === 'Other')!.value = 100;
      }
      
      setSectorData(sectorArray);
    } catch (error) {
      console.error("Error processing transaction data:", error);
    }
  };
  
  // Calculate metrics for cards
  const totalInvestment = useMemo(() => {
    return investmentData.reduce((sum, item) => sum + (item.amount || 0), 0);
  }, [investmentData]);
  
  const totalInvestors = useMemo(() => {
    // Find the maximum number of investors/startups across all months
    return investmentData.reduce((max, item) => Math.max(max, item.investors || 0), 0);
  }, [investmentData]);
  
  const averageInvestment = useMemo(() => {
    if (!totalInvestors) return 0;
    return totalInvestment / totalInvestors;
  }, [totalInvestment, totalInvestors]);

  const handleTimeRangeChange = (value: string) => {
    setTimeRange(value);
    // Here you would fetch new data based on the time range
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{isFounderView ? 'Funding Analytics' : 'Investment Analytics'}</h2>
          <p className="text-muted-foreground">
            {isFounderView 
              ? 'Track your startup funding and investor engagement' 
              : 'Monitor your investment portfolio performance'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={handleTimeRangeChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30days">Last 30 days</SelectItem>
              <SelectItem value="3months">Last 3 months</SelectItem>
              <SelectItem value="6months">Last 6 months</SelectItem>
              <SelectItem value="1year">Last year</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon">
            <Filter className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total {isFounderView ? 'Funding' : 'Invested'}
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(totalInvestment/1000).toFixed(1)}K</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-500 font-medium">+20.1%</span> from last period
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {isFounderView ? 'Investors' : 'Startups Funded'}
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalInvestors}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-500 font-medium">+12.5%</span> from last period
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Avg. {isFounderView ? 'Investment Size' : 'Investment'}
            </CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(averageInvestment/1000).toFixed(1)}K</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-amber-500 font-medium">+2.5%</span> from last period
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Growth Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+28.4%</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-500 font-medium">+4.1%</span> from last period
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Chart Tabs */}
      <Tabs defaultValue="investment" className="space-y-4">
        <div className="flex justify-between items-center">
          <TabsList>
            <TabsTrigger value="investment" className="flex items-center gap-1">
              <BarChart2 className="h-4 w-4" /> {isFounderView ? 'Funding' : 'Investments'}
            </TabsTrigger>
            <TabsTrigger value="sectors" className="flex items-center gap-1">
              <PieChartIcon className="h-4 w-4" /> Sectors
            </TabsTrigger>
            <TabsTrigger value="trends" className="flex items-center gap-1">
              <LineChartIcon className="h-4 w-4" /> Trends
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex items-center gap-1">
              <Activity className="h-4 w-4" /> Activity
            </TabsTrigger>
          </TabsList>
          
          <div className="flex gap-2">
            <Button 
              variant={chartType === 'bar' ? "default" : "outline"} 
              size="sm" 
              onClick={() => setChartType('bar')}
              className="h-8"
            >
              <BarChart2 className="h-4 w-4 mr-1" /> Bar
            </Button>
            <Button 
              variant={chartType === 'line' ? "default" : "outline"} 
              size="sm" 
              onClick={() => setChartType('line')}
              className="h-8"
            >
              <LineChartIcon className="h-4 w-4 mr-1" /> Line
            </Button>
            <Button 
              variant={chartType === 'area' ? "default" : "outline"} 
              size="sm" 
              onClick={() => setChartType('area')}
              className="h-8"
            >
              <Activity className="h-4 w-4 mr-1" /> Area
            </Button>
          </div>
        </div>
        
        <TabsContent value="investment" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{isFounderView ? 'Funding Overview' : 'Investment Overview'}</CardTitle>
              <CardDescription>
                {isFounderView 
                  ? 'Monthly breakdown of your startup funding' 
                  : 'Monthly breakdown of your investment activity'}
              </CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
              <div className="h-[350px]">
                {chartType === 'bar' && (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={investmentData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar 
                        dataKey="amount" 
                        name={isFounderView ? "Funding Amount ($)" : "Investment Amount ($)"} 
                        fill="#0088FE" 
                      />
                      <Bar 
                        dataKey="investors" 
                        name={isFounderView ? "Number of Investors" : "Startups Funded"} 
                        fill="#00C49F" 
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
                
                {chartType === 'line' && (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={investmentData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="amount" 
                        name={isFounderView ? "Funding Amount ($)" : "Investment Amount ($)"} 
                        stroke="#0088FE" 
                        activeDot={{ r: 8 }} 
                      />
                      <Line 
                        type="monotone" 
                        dataKey="investors" 
                        name={isFounderView ? "Number of Investors" : "Startups Funded"} 
                        stroke="#00C49F" 
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
                
                {chartType === 'area' && (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={investmentData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Area 
                        type="monotone" 
                        dataKey="amount" 
                        name={isFounderView ? "Funding Amount ($)" : "Investment Amount ($)"} 
                        stroke="#0088FE" 
                        fill="#0088FE" 
                        fillOpacity={0.3} 
                      />
                      <Area 
                        type="monotone" 
                        dataKey="investors" 
                        name={isFounderView ? "Number of Investors" : "Startups Funded"} 
                        stroke="#00C49F" 
                        fill="#00C49F" 
                        fillOpacity={0.3} 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Your latest investment activities</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {loading ? (
                    Array(3).fill(0).map((_, i) => (
                      <div key={i} className="flex items-center gap-4">
                        <Skeleton className="h-9 w-9 rounded-full" />
                        <div className="flex-1 space-y-1">
                          <Skeleton className="h-4 w-3/4" />
                          <Skeleton className="h-3 w-1/2" />
                        </div>
                        <Skeleton className="h-5 w-20" />
                      </div>
                    ))
                  ) : recentTransactions.length === 0 ? (
                    <div className="py-8 text-center">
                      <p className="text-sm text-muted-foreground">No recent activities found</p>
                    </div>
                  ) : recentTransactions.map((tx, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                        <Wallet className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium leading-none">
                          {isFounderView 
                            ? `Investment of $${parseFloat(tx.amount || "0").toFixed(2)}` 
                            : `Invested $${parseFloat(tx.amount || "0").toFixed(2)} in ${tx.startupName || 'Startup'}`}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {tx.createdAt ? new Date(tx.createdAt).toLocaleDateString() : 'Date unavailable'}
                        </p>
                      </div>
                      <Badge variant={tx.status === 'completed' ? 'default' : 'outline'}>
                        {tx.status || (isFounderView ? 'Funding' : 'Investment')}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full">View All Activity</Button>
              </CardFooter>
            </Card>
            
            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>Investment by Sector</CardTitle>
                <CardDescription>Distribution across different industries</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={sectorData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {sectorData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `${value}%`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {sectorData.map((sector, index) => (
                    <div key={sector.name} className="flex items-center gap-2">
                      <div 
                        className="h-3 w-3 rounded-full" 
                        style={{ backgroundColor: COLORS[index % COLORS.length] }} 
                      />
                      <span className="text-xs">{sector.name}: {sector.value}%</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="sectors">
          <Card>
            <CardHeader>
              <CardTitle>Investment by Sector</CardTitle>
              <CardDescription>
                Breakdown of {isFounderView ? 'funding sources' : 'your investments'} by industry
              </CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sectorData}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={150}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {sectorData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `${value}%`} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="trends">
          <Card>
            <CardHeader>
              <CardTitle>Growth Trends</CardTitle>
              <CardDescription>
                {isFounderView 
                  ? 'Track your funding momentum over time' 
                  : 'Track your investment portfolio growth'}
              </CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={investmentData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="amount" 
                      name={isFounderView ? "Funding Amount ($)" : "Investment Amount ($)"} 
                      stroke="#0088FE" 
                      activeDot={{ r: 8 }} 
                    />
                    <Line 
                      type="monotone" 
                      dataKey="investors" 
                      name={isFounderView ? "Number of Investors" : "Startups Funded"} 
                      stroke="#00C49F" 
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>
                Your latest {isFounderView ? 'funding' : 'investment'} activities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {loading ? (
                  Array(6).fill(0).map((_, i) => (
                    <div key={i} className="flex items-start gap-4 border-b pb-4 last:border-0">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <Skeleton className="h-4 w-1/3" />
                          <Skeleton className="h-3 w-1/4" />
                        </div>
                        <Skeleton className="h-3 w-2/3" />
                        <div className="mt-2 flex gap-2">
                          <Skeleton className="h-5 w-16" />
                          <Skeleton className="h-5 w-20" />
                        </div>
                      </div>
                    </div>
                  ))
                ) : recentTransactions.length === 0 ? (
                  <div className="py-12 text-center">
                    <Wallet className="mx-auto h-12 w-12 text-muted-foreground opacity-50 mb-4" />
                    <h3 className="text-lg font-medium mb-2">No activity yet</h3>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto">
                      {isFounderView 
                        ? "You haven't received any investments for your startups yet." 
                        : "You haven't made any investments yet."}
                    </p>
                  </div>
                ) : recentTransactions.map((tx, i) => (
                  <div key={i} className="flex items-start gap-4 border-b pb-4 last:border-0">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Wallet className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium leading-none">
                          {isFounderView 
                            ? `Investment from ${tx.investorName || `Investor ${tx.investorId || '#' + i}`}` 
                            : `Invested in ${tx.startupName || `Startup ${tx.startupId || '#' + i}`}`}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {tx.createdAt ? new Date(tx.createdAt).toLocaleDateString() : 'Date unavailable'}
                        </p>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {isFounderView 
                          ? `Received $${parseFloat(tx.amount || "0").toFixed(2)} in funding` 
                          : `$${parseFloat(tx.amount || "0").toFixed(2)} ${tx.equity ? `for ${tx.equity}% equity` : ''}`}
                      </p>
                      <div className="mt-2 flex gap-2">
                        {tx.category && <Badge variant="outline">{tx.category}</Badge>}
                        {tx.stage && <Badge variant="outline">{tx.stage}</Badge>}
                        <Badge variant={tx.status === 'completed' ? 'default' : 'outline'}>
                          {tx.status || 'pending'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full">Load More</Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default InvestmentAnalytics;