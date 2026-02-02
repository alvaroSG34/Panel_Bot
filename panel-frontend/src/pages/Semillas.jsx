import { useState } from 'react'
import { Box, Typography, Paper, Stepper, Step, StepLabel, Button, TextField, MenuItem, Alert, LinearProgress, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material'
import { CloudUpload as UploadIcon } from '@mui/icons-material'
import api from '../api/axios'

const steps = ['Tipo de CSV', 'Cargar Archivo', 'Vista Previa', 'Importar']

const Semillas = () => {
  const [activeStep, setActiveStep] = useState(0)
  const [csvType, setCsvType] = useState('')
  const [file, setFile] = useState(null)
  const [dryRun, setDryRun] = useState(true)
  const [tolerant, setTolerant] = useState(false)
  const [previewResult, setPreviewResult] = useState(null)
  const [importing, setImporting] = useState(false)

  const handleNext = () => {
    setActiveStep((prev) => prev + 1)
  }

  const handleBack = () => {
    setActiveStep((prev) => prev - 1)
  }

  const handleReset = () => {
    setActiveStep(0)
    setCsvType('')
    setFile(null)
    setPreviewResult(null)
    setDryRun(true)
    setTolerant(false)
  }

  const handleFileChange = (e) => {
    setFile(e.target.files[0])
  }

  const handlePreview = async () => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('type', csvType)
    formData.append('dryRun', 'true')
    formData.append('tolerant', tolerant ? 'true' : 'false')

    try {
      const response = await api.post('/seeding/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setPreviewResult(response.data)
      handleNext()
    } catch (error) {
      console.error('Error en vista previa:', error)
      alert(error.response?.data?.message || 'Error al procesar archivo')
    }
  }

  const handleImport = async () => {
    setImporting(true)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('type', csvType)
    formData.append('dryRun', 'false')
    formData.append('tolerant', tolerant ? 'true' : 'false')

    try {
      const response = await api.post('/seeding/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setPreviewResult(response.data)
      setImporting(false)
      alert('Importación completada exitosamente')
    } catch (error) {
      console.error('Error en importación:', error)
      alert(error.response?.data?.message || 'Error al importar datos')
      setImporting(false)
    }
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Importar Datos desde CSV
      </Typography>

      <Paper sx={{ p: 3, mt: 2 }}>
        <Stepper activeStep={activeStep}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        <Box sx={{ mt: 4 }}>
          {activeStep === 0 && (
            <Box>
              <TextField
                select
                label="Tipo de CSV"
                value={csvType}
                onChange={(e) => setCsvType(e.target.value)}
                fullWidth
                margin="normal"
              >
                <MenuItem value="students">Estudiantes</MenuItem>
                <MenuItem value="groups">Grupos</MenuItem>
                <MenuItem value="group_mappings">Mapeos Grupo-Materia</MenuItem>
              </TextField>
              <Box sx={{ mt: 2 }}>
                <Button variant="contained" onClick={handleNext} disabled={!csvType}>
                  Siguiente
                </Button>
              </Box>
            </Box>
          )}

          {activeStep === 1 && (
            <Box>
              <Typography variant="body1" gutterBottom>
                Seleccione el archivo CSV para {csvType === 'students' ? 'estudiantes' : csvType === 'groups' ? 'grupos' : 'mapeos'}
              </Typography>
              <Button variant="outlined" component="label" startIcon={<UploadIcon />} sx={{ mt: 2 }}>
                Seleccionar Archivo
                <input type="file" hidden accept=".csv" onChange={handleFileChange} />
              </Button>
              {file && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Archivo: {file.name}
                </Typography>
              )}
              <TextField
                select
                label="Modo Tolerante (continuar con errores)"
                value={tolerant}
                onChange={(e) => setTolerant(e.target.value === 'true')}
                fullWidth
                margin="normal"
              >
                <MenuItem value={false}>No</MenuItem>
                <MenuItem value={true}>Sí</MenuItem>
              </TextField>
              <Box sx={{ mt: 2 }}>
                <Button onClick={handleBack} sx={{ mr: 1 }}>
                  Atrás
                </Button>
                <Button variant="contained" onClick={handlePreview} disabled={!file}>
                  Vista Previa
                </Button>
              </Box>
            </Box>
          )}

          {activeStep === 2 && previewResult && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Vista Previa de Resultados
              </Typography>
              
              {previewResult.errors && previewResult.errors.length > 0 && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  Se encontraron {previewResult.errors.length} errores
                </Alert>
              )}
              
              <Alert severity="info" sx={{ mb: 2 }}>
                Total registros: {previewResult.total}
                {previewResult.created && ` | Creados: ${previewResult.created}`}
                {previewResult.updated && ` | Actualizados: ${previewResult.updated}`}
                {previewResult.skipped && ` | Omitidos: ${previewResult.skipped}`}
              </Alert>

              {previewResult.errors && previewResult.errors.length > 0 && (
                <Paper sx={{ p: 2, maxHeight: 300, overflow: 'auto' }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Fila</TableCell>
                        <TableCell>Error</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {previewResult.errors.map((error, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{error.row}</TableCell>
                          <TableCell>{error.error}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Paper>
              )}

              <Box sx={{ mt: 2 }}>
                <Button onClick={handleBack} sx={{ mr: 1 }}>
                  Atrás
                </Button>
                <Button variant="contained" onClick={handleNext}>
                  Continuar
                </Button>
              </Box>
            </Box>
          )}

          {activeStep === 3 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Confirmar Importación
              </Typography>
              <Alert severity="warning" sx={{ mb: 2 }}>
                Esta acción insertará los datos en la base de datos. ¿Desea continuar?
              </Alert>
              {importing && <LinearProgress sx={{ mb: 2 }} />}
              <Box>
                <Button onClick={handleBack} sx={{ mr: 1 }} disabled={importing}>
                  Atrás
                </Button>
                <Button variant="contained" onClick={handleImport} disabled={importing}>
                  {importing ? 'Importando...' : 'Importar'}
                </Button>
                <Button onClick={handleReset} sx={{ ml: 1 }}>
                  Reiniciar
                </Button>
              </Box>
            </Box>
          )}
        </Box>
      </Paper>
    </Box>
  )
}

export default Semillas
