// SichrPlace Real-time Notifications Edge Function
// Handles real-time notifications for apartment activities

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { type, data } = await req.json()

    console.log('📡 Real-time notification request:', { type, data })

    let notification = {}

    switch (type) {
      case 'viewing_request_created':
        notification = await handleViewingRequestCreated(supabase, data)
        break
      case 'viewing_request_confirmed':
        notification = await handleViewingRequestConfirmed(supabase, data)
        break
      case 'new_message':
        notification = await handleNewMessage(supabase, data)
        break
      case 'apartment_liked':
        notification = await handleApartmentLiked(supabase, data)
        break
      case 'payment_completed':
        notification = await handlePaymentCompleted(supabase, data)
        break
      default:
        throw new Error(`Unknown notification type: ${type}`)
    }

    // Store notification in database
    const { data: savedNotification, error } = await supabase
      .from('notifications')
      .insert({
        user_id: notification.user_id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data,
        read: false
      })
      .select()
      .single()

    if (error) throw error

    // Send real-time notification via Supabase channel
    await supabase
      .channel(`user_${notification.user_id}`)
      .send({
        type: 'broadcast',
        event: 'notification',
        payload: savedNotification
      })

    // Send push notification if user has enabled them
    if (notification.push_enabled) {
      await sendPushNotification(notification)
    }

    return new Response(
      JSON.stringify({
        success: true,
        notification: savedNotification
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('🚨 Notification error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})

async function handleViewingRequestCreated(supabase: any, data: any) {
  const { viewing_request_id } = data
  
  // Get viewing request details
  const { data: viewingRequest } = await supabase
    .from('viewing_requests')
    .select(`
      *,
      apartments (title, address, landlord_id),
      users!viewing_requests_tenant_id_fkey (first_name, last_name)
    `)
    .eq('id', viewing_request_id)
    .single()

  return {
    user_id: viewingRequest.apartments.landlord_id,
    type: 'viewing_request',
    title: 'New Viewing Request',
    message: `${viewingRequest.users.first_name} ${viewingRequest.users.last_name} wants to view ${viewingRequest.apartments.title}`,
    data: {
      viewing_request_id,
      apartment_id: viewingRequest.apartment_id,
      tenant_name: `${viewingRequest.users.first_name} ${viewingRequest.users.last_name}`
    },
    push_enabled: true
  }
}

async function handleViewingRequestConfirmed(supabase: any, data: any) {
  const { viewing_request_id } = data
  
  const { data: viewingRequest } = await supabase
    .from('viewing_requests')
    .select(`
      *,
      apartments (title, address)
    `)
    .eq('id', viewing_request_id)
    .single()

  return {
    user_id: viewingRequest.tenant_id,
    type: 'viewing_confirmed',
    title: 'Viewing Confirmed',
    message: `Your viewing for ${viewingRequest.apartments.title} has been confirmed`,
    data: {
      viewing_request_id,
      apartment_id: viewingRequest.apartment_id,
      preferred_date: viewingRequest.preferred_date
    },
    push_enabled: true
  }
}

async function handleNewMessage(supabase: any, data: any) {
  const { message_id } = data
  
  const { data: message } = await supabase
    .from('messages')
    .select(`
      *,
      conversations (
        apartment_id,
        landlord_id,
        tenant_id,
        apartments (title)
      ),
      users!messages_sender_id_fkey (first_name, last_name)
    `)
    .eq('id', message_id)
    .single()

  const recipient_id = message.sender_id === message.conversations.landlord_id 
    ? message.conversations.tenant_id 
    : message.conversations.landlord_id

  return {
    user_id: recipient_id,
    type: 'new_message',
    title: 'New Message',
    message: `${message.users.first_name} sent you a message about ${message.conversations.apartments.title}`,
    data: {
      message_id,
      conversation_id: message.conversation_id,
      sender_name: `${message.users.first_name} ${message.users.last_name}`,
      preview: message.content.substring(0, 100)
    },
    push_enabled: true
  }
}

async function handleApartmentLiked(supabase: any, data: any) {
  const { apartment_id, user_id } = data
  
  const { data: apartment } = await supabase
    .from('apartments')
    .select('title, landlord_id')
    .eq('id', apartment_id)
    .single()

  const { data: user } = await supabase
    .from('users')
    .select('first_name, last_name')
    .eq('id', user_id)
    .single()

  return {
    user_id: apartment.landlord_id,
    type: 'apartment_liked',
    title: 'Apartment Liked',
    message: `${user.first_name} ${user.last_name} liked your apartment: ${apartment.title}`,
    data: {
      apartment_id,
      liker_id: user_id,
      liker_name: `${user.first_name} ${user.last_name}`
    },
    push_enabled: false // Less urgent notification
  }
}

async function handlePaymentCompleted(supabase: any, data: any) {
  const { payment_id, viewing_request_id } = data
  
  const { data: viewingRequest } = await supabase
    .from('viewing_requests')
    .select(`
      *,
      apartments (title)
    `)
    .eq('id', viewing_request_id)
    .single()

  return {
    user_id: viewingRequest.tenant_id,
    type: 'payment_completed',
    title: 'Payment Confirmed',
    message: `Your viewing fee for ${viewingRequest.apartments.title} has been processed`,
    data: {
      payment_id,
      viewing_request_id,
      amount: viewingRequest.viewing_fee_paid
    },
    push_enabled: true
  }
}

async function sendPushNotification(notification: any) {
  // Placeholder for push notification service integration
  console.log('📱 Sending push notification:', notification.title)
  
  // Here you would integrate with services like:
  // - Firebase Cloud Messaging
  // - Apple Push Notification Service
  // - Web Push API
  // - OneSignal, etc.
}
