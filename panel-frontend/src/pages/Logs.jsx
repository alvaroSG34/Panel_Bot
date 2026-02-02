import { useEffect, useState, useRef } from 'react'
import { Box, Typography, Paper, TextField, Button, Chip, Alert } from '@mui/material'
import { Refresh as RefreshIcon } from '@mui/icons-material'
import api from '../api/axios'

const Logs = () => {
  const [logs, setLogs] = useState([])
  const [lines, setLines] = useState(50)
  const [fileInfo, setFileInfo] = useState(null)
  const [error, setError] = useState(null)
  const logsEndRef = useRef(null)

  useEffect(() => {
    fetchLogs()
    const interval = setInterval(fetchLogs, 30000) // Poll cada 30s
    return () => clearInterval(interval)
  }, [lines])

  const fetchLogs = async () => {
    try {
      setError(null)
      const [logsRes, infoRes] = await Promise.all([
        api.get(`/logs/recent?lines=${lines}`),
        api.get('/logs/info')
      ])
      setLogs(logsRes.data.lines || [])
      setFileInfo(infoRes.data)
      
      // Auto-scroll al final
      setTimeout(() => {
        logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      }, 100)
    } catch (err) {
      console.error('Error al obtener logs:', err)
      setError(err.response?.data?.message || 'Error al cargar logs')
    }
  }

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 KB'
    return (bytes / 1024).toFixed(2) + ' KB'
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4">Logs del Bot</Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            type="number"
            label="Líneas"
            value={lines}
            onChange={(e) => setLines(parseInt(e.target.value) || 50)}
            size="small"
            sx={{ width: 100 }}
          />
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchLogs}>
            Actualizar
          </Button>
        </Box>
      </Box>

      {fileInfo && (
        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <Chip label={`Archivo: ${fileInfo.fileName}`} />
          <Chip label={`Tamaño: ${formatFileSize(fileInfo.sizeBytes)}`} color="primary" />
          <Chip 
            label={`Modificado: ${new Date(fileInfo.lastModified).toLocaleString('es-ES')}`} 
            color="secondary" 
          />
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper 
        sx={{ 
          p: 2, 
          bgcolor: '#1e1e1e', 
          color: '#d4d4d4',
          fontFamily: 'monospace',
          fontSize: '0.875rem',
          maxHeight: 600,
          overflow: 'auto'
        }}
      >
        {logs.length === 0 ? (
          <Typography color="text.secondary">No hay logs disponibles</Typography>
        ) : (
          <>
            {logs.map((log, idx) => (
              <Box key={idx} sx={{ mb: 0.5 }}>
                {log}
              </Box>
            ))}
            <div ref={logsEndRef} />
          </>
        )}
      </Paper>

      <Alert severity="info" sx={{ mt: 2 }}>
        Los logs se actualizan automáticamente cada 30 segundos
      </Alert>
    </Box>
  )
}

export default Logs
