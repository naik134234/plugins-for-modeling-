import numpy as np
import pandas as pd
from scipy import stats
from typing import Dict, Tuple, List, Optional
from src.core.logging_config import LoggerMixin

class ValueAtRiskCalculator(LoggerMixin):
    """
    Calculate Value at Risk using three different methodologies:
    1. Historical VaR
    2. Parametric (Variance-Covariance) VaR
    3. Monte Carlo VaR
    """
    
    def __init__(self, confidence_level: float = 0.95):
        """
        Initialize with confidence level (e.g., 0.95 for 95% VaR)
        """
        self.confidence_level = confidence_level
        self.alpha = 1 - confidence_level
    
    def historical_var(
        self, 
        returns: List[float], 
        portfolio_value: float,
        time_horizon: int = 1
    ) -> Dict:
        """
        Historical VaR - uses actual historical returns distribution.
        Advantages: No distribution assumptions.
        Disadvantages: Limited by historical data available.
        """
        try:
            returns_array = np.array(returns)
            
            if len(returns_array) == 0:
                raise ValueError("Returns data cannot be empty")
            
            # Sort returns from worst to best
            sorted_returns = np.sort(returns_array)
            
            # Find the VaR threshold index
            var_index = int(self.alpha * len(sorted_returns))
            
            # Calculate VaR (in percentage terms)
            var_percentile = sorted_returns[var_index]
            
            # Adjust for time horizon (square root rule)
            var_percentile_adjusted = var_percentile * np.sqrt(time_horizon)
            
            # Calculate absolute dollar VaR (VaR is typically expressed as a positive loss)
            var_absolute = portfolio_value * abs(var_percentile_adjusted)
            
            # Expected Shortfall (CVaR) - average of all losses beyond VaR
            # Only consider the tail losses
            tail_losses = sorted_returns[:var_index]
            if len(tail_losses) > 0:
                expected_shortfall = abs(np.mean(tail_losses)) * portfolio_value * np.sqrt(time_horizon)
            else:
                expected_shortfall = var_absolute
            
            return {
                "var_method": "Historical",
                "confidence_level": f"{self.confidence_level * 100}%",
                "var_percentage": round(abs(var_percentile_adjusted) * 100, 4),
                "var_absolute": round(var_absolute, 2),
                "expected_shortfall": round(expected_shortfall, 2),
                "time_horizon_days": time_horizon,
                "data_points_used": len(returns)
            }
        except Exception as e:
            self.logger.error(f"Error in Historical VaR calculation: {str(e)}")
            raise
    
    def parametric_var(
        self, 
        returns: List[float], 
        portfolio_value: float,
        time_horizon: int = 1,
        EWMA_lambda: float = 0.94
    ) -> Dict:
        """
        Parametric (Variance-Covariance) VaR - assumes normal distribution.
        Uses EWMA (Exponentially Weighted Moving Average) for volatility.
        """
        try:
            returns_array = np.array(returns)
            
            if len(returns_array) == 0:
                raise ValueError("Returns data cannot be empty")
            
            # Calculate mean and standard deviation
            mean_return = np.mean(returns_array)
            
            # EWMA volatility calculation or standard deviation
            if EWMA_lambda and 0 < EWMA_lambda < 1:
                weights = EWMA_lambda ** np.arange(len(returns_array))[::-1]
                weights = weights / weights.sum()
                variance = np.sum(weights * (returns_array - mean_return) ** 2)
                volatility = np.sqrt(variance)
            else:
                volatility = np.std(returns_array)
            
            # Annualize volatility (assuming daily returns)
            annualized_vol = volatility * np.sqrt(252)
            
            # Adjust for time horizon
            volatility_adjusted = volatility * np.sqrt(time_horizon)
            
            # Z-score for the confidence level (e.g., 1.645 for 95%)
            z_score = stats.norm.ppf(self.alpha)
            
            # Calculate VaR
            # VaR = -(Mean * Time + Z * Volatility)
            # We usually ignore mean for short horizons, but let's include it
            var_percentile = -(mean_return * time_horizon + z_score * volatility_adjusted)
            
            # Ensure VaR is positive (loss)
            var_percentile = max(0, var_percentile)
            var_absolute = portfolio_value * var_percentile
            
            # Expected Shortfall under normal distribution
            # ES = mu + sigma * (pdf(z) / alpha)
            es_z_term = stats.norm.pdf(z_score) / self.alpha
            expected_shortfall_pct = -(mean_return * time_horizon + volatility_adjusted * es_z_term)
            expected_shortfall = portfolio_value * max(0, expected_shortfall_pct)
            
            return {
                "var_method": "Parametric (Normal)",
                "confidence_level": f"{self.confidence_level * 100}%",
                "daily_volatility": round(volatility * 100, 4),
                "annualized_volatility": round(annualized_vol * 100, 2),
                "var_percentage": round(var_percentile * 100, 4),
                "var_absolute": round(var_absolute, 2),
                "expected_shortfall": round(expected_shortfall, 2),
                "time_horizon_days": time_horizon
            }
        except Exception as e:
            self.logger.error(f"Error in Parametric VaR calculation: {str(e)}")
            raise
    
    def monte_carlo_var(
        self, 
        returns: List[float], 
        portfolio_value: float,
        time_horizon: int = 1,
        num_simulations: int = 10000,
        num_assets: int = 1
    ) -> Dict:
        """
        Monte Carlo VaR - simulates thousands of random portfolio paths.
        Works well for non-linear portfolios (options, derivatives).
        """
        try:
            returns_array = np.array(returns)
            
            if len(returns_array) == 0:
                raise ValueError("Returns data cannot be empty")
            
            # Estimate parameters from historical data
            mean_return = np.mean(returns_array)
            std_return = np.std(returns_array)
            
            # Generate random returns using normal distribution
            # For geometric brownian motion: S_t = S_0 * exp((mu - 0.5*sigma^2)*t + sigma*W_t)
            # But for simple VaR, simple normal approximation is often used
            random_returns = np.random.normal(
                mean_return, 
                std_return, 
                (num_simulations, num_assets)
            )
            
            # Calculate portfolio values at end of time horizon
            # Use square root of time rule for drift and diffusion
            adjusted_returns = random_returns * np.sqrt(time_horizon)
            
            # Simulated portfolio values
            # Assuming linear portfolio for now
            simulated_pnl_pct = adjusted_returns.flatten()
            
            # Sort from lowest to highest (losses are negative)
            sorted_pnl = np.sort(simulated_pnl_pct)
            
            # Find VaR threshold index
            var_index = int(self.alpha * num_simulations)
            
            # Calculate VaR (percentile loss)
            var_percentile = abs(sorted_pnl[var_index])
            var_absolute = portfolio_value * var_percentile
            
            # Expected Shortfall
            tail_losses = sorted_pnl[:var_index]
            if len(tail_losses) > 0:
                expected_shortfall_pct = abs(np.mean(tail_losses))
                expected_shortfall = portfolio_value * expected_shortfall_pct
            else:
                expected_shortfall = var_absolute
            
            # Calculate percentiles for reporting
            percentile_5 = np.percentile(simulated_pnl_pct, 5)
            percentile_1 = np.percentile(simulated_pnl_pct, 1)
            
            return {
                "var_method": "Monte Carlo",
                "confidence_level": f"{self.confidence_level * 100}%",
                "num_simulations": num_simulations,
                "var_absolute": round(var_absolute, 2),
                "expected_shortfall": round(expected_shortfall, 2),
                "var_percentage": round(var_percentile * 100, 4),
                "simulated_5th_percentile_return": round(float(percentile_5 * 100), 2),
                "simulated_1st_percentile_return": round(float(percentile_1 * 100), 2),
                "average_simulated_return": round(float(np.mean(simulated_pnl_pct) * 100), 2)
            }
        except Exception as e:
            self.logger.error(f"Error in Monte Carlo VaR calculation: {str(e)}")
            raise
