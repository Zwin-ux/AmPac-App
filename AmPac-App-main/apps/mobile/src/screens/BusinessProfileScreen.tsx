import React, { useState, useEffect } from "react"
import { View, Text, TextInput, Button } from "react-native"
import { auth, db } from "../../firebaseConfig"
import { doc, getDoc, setDoc } from "firebase/firestore"

const primaryBlue = "#0064A6"
const lightBackground = "#F4F7FA"

export default function BusinessProfileScreen({ navigation }: any) {
    const user = auth.currentUser
    const [name, setName] = useState("")
    const [zip, setZip] = useState("")
    const [revenueRange, setRevenueRange] = useState("")
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        if (!user) return
        const load = async () => {
            const ref = doc(db, "businesses", user.uid)
            const snap = await getDoc(ref)
            if (snap.exists()) {
                const data: any = snap.data()
                setName(data.name || "")
                setZip(data.zip || "")
                setRevenueRange(data.revenueRange || "")
                navigation.replace("Home")
            }
        }
        load()
    }, [user])

    const handleSave = async () => {
        if (!user) return
        setSaving(true)
        const ref = doc(db, "businesses", user.uid)
        await setDoc(ref, {
            ownerId: user.uid,
            name,
            zip,
            revenueRange,
            updatedAt: Date.now()
        })
        setSaving(false)
        navigation.replace("Home")
    }

    return (
        <View style={{ flex: 1, backgroundColor: lightBackground, padding: 24 }}>
            <View style={{ alignItems: "center", marginBottom: 24 }}>
                <Text style={{ marginTop: 8, color: primaryBlue, fontSize: 18, fontWeight: "600" }}>
                    Welcome to AmPac Companion
                </Text>
            </View>

            <Text style={{ fontSize: 16, marginBottom: 12 }}>
                Tell us a few basics about your business so we can guide you.
            </Text>

            <Text style={{ marginTop: 12 }}>Business name</Text>
            <TextInput
                style={{ borderWidth: 1, borderColor: "#D0D7E2", borderRadius: 8, padding: 10, backgroundColor: "white" }}
                value={name}
                onChangeText={setName}
            />

            <Text style={{ marginTop: 12 }}>Zip code</Text>
            <TextInput
                style={{ borderWidth: 1, borderColor: "#D0D7E2", borderRadius: 8, padding: 10, backgroundColor: "white" }}
                keyboardType="number-pad"
                value={zip}
                onChangeText={setZip}
            />

            <Text style={{ marginTop: 12 }}>Annual revenue range</Text>
            <TextInput
                placeholder="for example under 100k or 100k to 500k"
                style={{ borderWidth: 1, borderColor: "#D0D7E2", borderRadius: 8, padding: 10, backgroundColor: "white" }}
                value={revenueRange}
                onChangeText={setRevenueRange}
            />

            <View style={{ marginTop: 24 }}>
                <Button title={saving ? "Saving..." : "Continue"} onPress={handleSave} disabled={saving} />
            </View>
        </View>
    )
}
