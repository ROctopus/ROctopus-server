# Test script that uses a long computation on some .Rdata file
args <- commandArgs(trailingOnly = TRUE)
inpLocation <- args[1]
outLocation <- args[2]
runID <- args[3]

load(inpLocation)

# extremely difficult computation
out <- numeric(length(df))
for (i in df){
  out[i] <- c(runID, "    ", Sys.time())
  Sys.sleep(3)
}

# save the result
save(out, outLocation)