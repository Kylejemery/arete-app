# Stoic QCA: fuzzy-set analysis of ancient Stoics
# Reads the Scores sheet of stoic_qca_codebook.xlsx and runs
# necessity tests, truth tables, and Boolean minimization.
#
# Packages: install.packages(c("QCA", "readxl"))
# Scores are already calibrated on a four-value fuzzy scale
# (0, .33, .67, 1), so calibrate() is not needed.

library(QCA)
library(readxl)

# ---- 1. Load data ---------------------------------------------------------
xlsx_path <- "stoic_qca_codebook.xlsx"   # adjust if the file lives elsewhere

raw <- read_excel(xlsx_path, sheet = "Scores")
dat <- as.data.frame(raw[, c("POW", "WLTH", "ADV", "TEACH", "PROF", "COURT", "CONS")])
rownames(dat) <- raw$Case

conds_base  <- c("POW", "WLTH", "ADV", "TEACH", "PROF")
conds_court <- c(conds_base, "COURT")

incl_cut <- 0.80   # sufficiency consistency threshold for a truth table row
n_cut    <- 1      # minimum number of cases for a row to count as observed

sink("stoic_qca_results.txt", split = TRUE)
cat("Stoic QCA results\n", format(Sys.time()), "\n\n")

# ---- 2. Necessity --------------------------------------------------------
# Is any single condition (or its negation) necessary for CONS?
# Look for inclusion (consistency) of about 0.90 or higher with reasonable
# coverage and relevance (RoN).
cat("==== Necessity: single conditions for CONS ====\n")
print(pof(dat[, conds_court], "CONS", data = dat, relation = "necessity"))
cat("\n==== Necessity: negated conditions for CONS ====\n")
print(pof(1 - dat[, conds_court], "CONS", data = dat, relation = "necessity"))

# ---- 3. Model A: five conditions -----------------------------------------
cat("\n\n==== Model A truth table (no COURT) ====\n")
ttA <- truthTable(dat, outcome = "CONS", conditions = conds_base,
                  incl.cut = incl_cut, n.cut = n_cut,
                  show.cases = TRUE, sort.by = c("OUT", "incl"))
print(ttA)

cat("\n---- Model A: conservative solution ----\n")
print(minimize(ttA, details = TRUE, show.cases = TRUE))
cat("\n---- Model A: parsimonious solution (uses remainders) ----\n")
print(minimize(ttA, include = "?", details = TRUE, show.cases = TRUE))

# ---- 4. Model B: add COURT -----------------------------------------------
cat("\n\n==== Model B truth table (with COURT) ====\n")
ttB <- truthTable(dat, outcome = "CONS", conditions = conds_court,
                  incl.cut = incl_cut, n.cut = n_cut,
                  show.cases = TRUE, sort.by = c("OUT", "incl"))
print(ttB)

cat("\n---- Model B: conservative solution ----\n")
print(minimize(ttB, details = TRUE, show.cases = TRUE))
cat("\n---- Model B: parsimonious solution (uses remainders) ----\n")
print(minimize(ttB, include = "?", details = TRUE, show.cases = TRUE))

# ---- 5. Negated outcome: what goes with inconsistency? --------------------
# Analyze ~CONS separately; QCA assumes causal asymmetry, so the recipe for
# failure need not be the mirror image of the recipe for success.
cat("\n\n==== Model B for ~CONS (inconsistency) ====\n")
ttN <- truthTable(dat, outcome = "~CONS", conditions = conds_court,
                  incl.cut = incl_cut, n.cut = n_cut,
                  show.cases = TRUE, sort.by = c("OUT", "incl"))
print(ttN)
print(minimize(ttN, include = "?", details = TRUE, show.cases = TRUE))

# ---- 6. Hypothesis check: paths from the first-pass reading --------------
cat("\n\n==== Fit of the hypothesized paths ====\n")
paths <- data.frame(
  TEACH_PROF        = pmin(dat$TEACH, dat$PROF),
  POW_WLTH_ADV_notP = pmin(dat$POW, dat$WLTH, dat$ADV, 1 - dat$PROF),
  POW_ADV_notC_notP = pmin(dat$POW, dat$ADV, 1 - dat$COURT, 1 - dat$PROF)
)
print(pof(paths, dat$CONS, relation = "sufficiency"))

# ---- 7. Robustness ---------------------------------------------------------
# (a) Stricter and looser thresholds
for (cut in c(0.75, 0.85)) {
  cat("\n\n==== Robustness: Model B at incl.cut =", cut, "====\n")
  tt <- truthTable(dat, outcome = "CONS", conditions = conds_court,
                   incl.cut = cut, n.cut = n_cut)
  print(minimize(tt, include = "?", details = TRUE))
}

# (b) Drop the boundary cases whose Stoicism is partly a later attribution
cat("\n\n==== Robustness: Model B without Thrasea and Helvidius ====\n")
core <- dat[!rownames(dat) %in% c("Thrasea Paetus", "Helvidius Priscus"), ]
tt_core <- truthTable(core, outcome = "CONS", conditions = conds_court,
                      incl.cut = incl_cut, n.cut = n_cut, show.cases = TRUE)
print(minimize(tt_core, include = "?", details = TRUE, show.cases = TRUE))

# (c) Observability check: does CONS track ADV mainly among tested cases?
cat("\n\n==== Observability: ADV as sufficient for CONS, all vs. tested cases ====\n")
tested <- raw$CONS_TESTED == 1
print(pof(dat$ADV, dat$CONS, relation = "sufficiency"))
print(pof(dat$ADV[tested], dat$CONS[tested], relation = "sufficiency"))

sink()

# ---- 8. Optional plot ------------------------------------------------------
# XY plot of the COURT path against the outcome
# XYplot(pmin(POW, ADV, 1 - COURT, 1 - PROF), CONS, data = dat, relation = "sufficiency")
