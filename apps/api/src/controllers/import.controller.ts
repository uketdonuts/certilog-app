import { Response } from 'express';
import * as XLSX from 'xlsx';
import prisma from '../config/database.js';
import { AuthRequest } from '../middleware/auth.js';
import { Role, DeliveryStatus, Priority } from '@prisma/client';

interface ExcelRow {
  nombre: string;
  telefono: string;
  direccion: string;
  cedula?: string;
  email?: string;
  latitud?: number;
  longitud?: number;
  notas?: string;
  descripcion?: string;
  detalles_paquete?: string;
  prioridad?: string;
  mensajero?: string;
}

function generateTrackingCode(): string {
  const prefix = 'CL';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}${timestamp}${random}`;
}

function parsePriority(value?: string): Priority {
  if (!value) return Priority.NORMAL;
  const upper = value.toUpperCase().trim();
  if (upper === 'BAJA' || upper === 'LOW') return Priority.LOW;
  if (upper === 'ALTA' || upper === 'HIGH') return Priority.HIGH;
  if (upper === 'URGENTE' || upper === 'URGENT') return Priority.URGENT;
  return Priority.NORMAL;
}

export async function importDeliveriesFromExcel(req: AuthRequest, res: Response): Promise<void> {
  try {
    // Check if user is ADMIN or DISPATCHER
    if (req.user!.role !== Role.ADMIN && req.user!.role !== Role.DISPATCHER) {
      res.status(403).json({ success: false, error: 'No tienes permiso para importar entregas' });
      return;
    }

    if (!req.file) {
      res.status(400).json({ success: false, error: 'No se proporcionó ningún archivo' });
      return;
    }

    // Parse Excel file
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<ExcelRow>(worksheet);

    if (rows.length === 0) {
      res.status(400).json({ success: false, error: 'El archivo no contiene datos' });
      return;
    }

    // Get all couriers for assignment matching
    const couriers = await prisma.user.findMany({
      where: { role: Role.COURIER, isActive: true },
      select: { id: true, fullName: true, username: true },
    });

    const results = {
      created: 0,
      customersCreated: 0,
      errors: [] as string[],
    };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // Excel rows start at 1, plus header row

      try {
        // Validate required fields
        if (!row.nombre || !row.telefono || !row.direccion) {
          results.errors.push(`Fila ${rowNum}: Faltan campos obligatorios (nombre, telefono, direccion)`);
          continue;
        }

        // Find or create customer - match by cedula, phone, OR email to avoid duplicates
        const cedulaTrimmed = row.cedula?.toString().trim() || null;
        const phoneTrimmed = row.telefono.toString().trim();
        const emailTrimmed = row.email?.trim() || null;

        const orConditions: any[] = [{ phone: phoneTrimmed }];
        if (cedulaTrimmed) orConditions.unshift({ cedula: cedulaTrimmed });
        if (emailTrimmed) orConditions.push({ email: emailTrimmed });

        let customer = await prisma.customer.findFirst({
          where: { OR: orConditions },
        });

        if (!customer) {
          customer = await prisma.customer.create({
            data: {
              name: row.nombre.trim(),
              phone: phoneTrimmed,
              cedula: cedulaTrimmed,
              address: row.direccion.trim(),
              email: emailTrimmed,
              latitude: row.latitud ? Number(row.latitud) : null,
              longitude: row.longitud ? Number(row.longitud) : null,
              notes: row.notas?.trim() || null,
            },
          });
          results.customersCreated++;
        } else if (cedulaTrimmed && !customer.cedula) {
          // Update existing customer with cedula if they don't have one
          customer = await prisma.customer.update({
            where: { id: customer.id },
            data: { cedula: cedulaTrimmed },
          });
        }

        // Find courier if specified
        let courierId: string | null = null;
        if (row.mensajero) {
          const courierName = row.mensajero.toString().trim().toLowerCase();
          const matchedCourier = couriers.find(
            (c) =>
              c.fullName.toLowerCase().includes(courierName) ||
              (c.username && c.username.toLowerCase().includes(courierName))
          );
          if (matchedCourier) {
            courierId = matchedCourier.id;
          }
        }

        // Create delivery
        await prisma.delivery.create({
          data: {
            trackingCode: generateTrackingCode(),
            customerId: customer.id,
            courierId,
            status: courierId ? DeliveryStatus.ASSIGNED : DeliveryStatus.PENDING,
            priority: parsePriority(row.prioridad),
            description: row.descripcion?.trim() || null,
            packageDetails: row.detalles_paquete?.trim() || null,
          },
        });

        results.created++;
      } catch (error) {
        console.error(`Error processing row ${rowNum}:`, error);
        results.errors.push(`Fila ${rowNum}: Error al procesar - ${error instanceof Error ? error.message : 'Error desconocido'}`);
      }
    }

    res.json({
      success: true,
      data: {
        deliveriesCreated: results.created,
        customersCreated: results.customersCreated,
        totalRows: rows.length,
        errors: results.errors,
      },
    });
  } catch (error) {
    console.error('Import deliveries error:', error);
    res.status(500).json({ success: false, error: 'Error al importar entregas' });
  }
}

export async function getImportTemplate(_req: AuthRequest, res: Response): Promise<void> {
  try {
    // Create template workbook
    const templateData = [
      {
        nombre: 'Juan Pérez',
        telefono: '65551234',
        cedula: '8-123-4567',
        direccion: 'Calle Principal 123, Ciudad de Panamá',
        email: 'juan@email.com',
        latitud: 9.0012,
        longitud: -79.4988,
        notas: 'Casa blanca con portón negro',
        descripcion: 'Paquete pequeño',
        detalles_paquete: 'Documentos importantes',
        prioridad: 'NORMAL',
        mensajero: '',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Entregas');

    // Set column widths
    worksheet['!cols'] = [
      { wch: 20 }, // nombre
      { wch: 12 }, // telefono
      { wch: 15 }, // cedula
      { wch: 40 }, // direccion
      { wch: 25 }, // email
      { wch: 12 }, // latitud
      { wch: 12 }, // longitud
      { wch: 30 }, // notas
      { wch: 25 }, // descripcion
      { wch: 25 }, // detalles_paquete
      { wch: 12 }, // prioridad
      { wch: 20 }, // mensajero
    ];

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=plantilla_entregas.xlsx');
    res.send(buffer);
  } catch (error) {
    console.error('Get template error:', error);
    res.status(500).json({ success: false, error: 'Error al generar plantilla' });
  }
}
