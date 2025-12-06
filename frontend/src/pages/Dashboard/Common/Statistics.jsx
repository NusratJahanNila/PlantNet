import AdminStatistics from '../../../components/Dashboard/Statistics/AdminStatistics'
import CustomerStatistics from '../../../components/Dashboard/Statistics/CustomerStatistics'
import SellerStatistics from '../../../components/Dashboard/Statistics/SellerStatistics'
import LoadingSpinner from '../../../components/Shared/LoadingSpinner';
import useRole from '../../../hooks/useRole'
const Statistics = () => {
  const {role,isRoleLoading}=useRole();

  if(isRoleLoading) return <LoadingSpinner></LoadingSpinner>
  return (
    <div>
      {
        role==='admin'  && <AdminStatistics />
      }
      {
        role==='seller'  && <SellerStatistics/>
      }
      {
        role==='customer'  && <CustomerStatistics />
      }
      
    </div>
  )
}

export default Statistics
